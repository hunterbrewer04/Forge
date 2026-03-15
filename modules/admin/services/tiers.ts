import { eq, count, and, not, sql } from 'drizzle-orm'
import { membershipTiers, profiles } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe'
import type { DrizzleInstance } from '../config'
import type { TierInput, TierUpdate } from '../types'
import { slugify } from '@/lib/utils/string'

async function uniqueSlug(db: DrizzleInstance, base: string, excludeId?: string): Promise<string> {
  // Fetch all slugs matching the base pattern in a single query
  const rows = await db
    .select({ slug: membershipTiers.slug })
    .from(membershipTiers)
    .where(
      excludeId
        ? and(
            sql`${membershipTiers.slug} LIKE ${base + '%'}`,
            not(eq(membershipTiers.id, excludeId))
          )
        : sql`${membershipTiers.slug} LIKE ${base + '%'}`
    )

  const existingSlugs = new Set(rows.map(r => r.slug))

  if (!existingSlugs.has(base)) return base

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!existingSlugs.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

type TierRow = typeof membershipTiers.$inferSelect

function serializeTier(tier: TierRow, subscriberCount?: number) {
  return {
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    stripe_price_id: tier.stripePriceId,
    stripe_product_id: tier.stripeProductId,
    monthly_booking_quota: tier.monthlyBookingQuota,
    price_monthly: tier.priceMonthly,
    is_active: tier.isActive,
    ...(subscriberCount !== undefined ? { subscriber_count: subscriberCount } : {}),
    created_at: tier.createdAt.toISOString(),
    updated_at: tier.updatedAt.toISOString(),
  }
}

export async function listTiers(db: DrizzleInstance) {
  const tiers = await db
    .select({
      tier: membershipTiers,
      subscriberCount: count(profiles.id),
    })
    .from(membershipTiers)
    .leftJoin(profiles, eq(profiles.membershipTierId, membershipTiers.id))
    .groupBy(membershipTiers.id)
    .orderBy(membershipTiers.createdAt)

  return tiers.map(({ tier, subscriberCount }) => serializeTier(tier, subscriberCount))
}

export async function createTier(db: DrizzleInstance, input: TierInput) {
  // 1. Create Stripe Product
  const product = await stripe.products.create({
    name: input.name,
    metadata: { source: 'forge-admin' },
  })

  // 2. Create Stripe Price (monthly recurring)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(input.priceMonthly * 100), // convert dollars to cents
    currency: 'usd',
    recurring: { interval: 'month' },
  })

  // 3. Insert into DB — on failure, clean up the orphaned Stripe objects
  const slug = await uniqueSlug(db, slugify(input.name))
  let tier: TierRow
  try {
    ;[tier] = await db
      .insert(membershipTiers)
      .values({
        name: input.name,
        slug,
        stripePriceId: price.id,
        stripeProductId: product.id,
        monthlyBookingQuota: input.monthlyBookingQuota,
        priceMonthly: String(input.priceMonthly),
        isActive: true,
      })
      .returning()
  } catch (err) {
    // Deleting the product also archives all of its prices
    await stripe.products.del(product.id)
    throw err
  }

  return serializeTier(tier)
}

export async function updateTier(
  db: DrizzleInstance,
  tierId: string,
  updates: TierUpdate
) {
  // Fetch current tier
  const current = await db.query.membershipTiers.findFirst({
    where: eq(membershipTiers.id, tierId),
  })
  if (!current) return null

  const dbUpdates: Record<string, unknown> = { updatedAt: new Date() }

  const nameChanged = updates.name && updates.name !== current.name
  const priceChanged = updates.priceMonthly !== undefined && String(updates.priceMonthly) !== current.priceMonthly

  // Stripe-side changes (name and/or price)
  let newStripePrice: { id: string } | null = null
  if (nameChanged || priceChanged) {
    const productId = current.stripeProductId || (await stripe.prices.retrieve(current.stripePriceId)).product as string

    if (nameChanged) {
      dbUpdates.name = updates.name
      dbUpdates.slug = await uniqueSlug(db, slugify(updates.name!), tierId)
      await stripe.products.update(productId, { name: updates.name! })
    }

    if (priceChanged) {
      newStripePrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(updates.priceMonthly! * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
      })
      await stripe.prices.update(current.stripePriceId, { active: false })
      dbUpdates.stripePriceId = newStripePrice.id
      dbUpdates.priceMonthly = String(updates.priceMonthly)
    }
  }

  // Common field updates
  if (updates.monthlyBookingQuota !== undefined) {
    dbUpdates.monthlyBookingQuota = updates.monthlyBookingQuota
  }
  if (updates.isActive !== undefined) {
    dbUpdates.isActive = updates.isActive
  }

  try {
    const [updated] = await db
      .update(membershipTiers)
      .set(dbUpdates)
      .where(eq(membershipTiers.id, tierId))
      .returning()
    return serializeTier(updated)
  } catch (err) {
    // Roll back the price swap: re-activate old price, archive the newly created one
    if (newStripePrice) {
      await Promise.all([
        stripe.prices.update(current.stripePriceId, { active: true }),
        stripe.prices.update(newStripePrice.id, { active: false }),
      ])
    }
    throw err
  }
}

export async function toggleTierVisibility(
  db: DrizzleInstance,
  tierId: string,
  isActive: boolean
) {
  const [updated] = await db
    .update(membershipTiers)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(membershipTiers.id, tierId))
    .returning({ id: membershipTiers.id, isActive: membershipTiers.isActive })

  return updated ?? null
}

export async function deleteTier(db: DrizzleInstance, tierId: string) {
  // Check for active subscribers and fetch tier in parallel
  const [[{ value: activeCount }], tier] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(eq(profiles.membershipTierId, tierId)),
    db.query.membershipTiers.findFirst({ where: eq(membershipTiers.id, tierId) }),
  ])

  if (!tier) return null

  if (activeCount > 0) {
    throw new Error(`Cannot delete tier with ${activeCount} active subscriber(s)`)
  }

  // Retrieve the price to get the product ID, then delete the product
  // (deleting the product automatically archives all its prices)
  const productId = tier.stripeProductId || (await stripe.prices.retrieve(tier.stripePriceId)).product as string
  await stripe.products.del(productId)

  // Hard-delete the row
  const [deleted] = await db
    .delete(membershipTiers)
    .where(eq(membershipTiers.id, tierId))
    .returning({ id: membershipTiers.id })

  return deleted
}
