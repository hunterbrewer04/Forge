import { eq, count } from 'drizzle-orm'
import { membershipTiers, profiles } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe'
import type { DrizzleInstance } from '../config'
import type { TierInput, TierUpdate } from '../types'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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

  return tiers.map(({ tier, subscriberCount }) => ({
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    stripe_price_id: tier.stripePriceId,
    monthly_booking_quota: tier.monthlyBookingQuota,
    price_monthly: tier.priceMonthly,
    is_active: tier.isActive,
    subscriber_count: subscriberCount,
    created_at: tier.createdAt.toISOString(),
    updated_at: tier.updatedAt.toISOString(),
  }))
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

  // 3. Insert into DB
  const slug = slugify(input.name)
  const [tier] = await db
    .insert(membershipTiers)
    .values({
      name: input.name,
      slug,
      stripePriceId: price.id,
      monthlyBookingQuota: input.monthlyBookingQuota,
      priceMonthly: String(input.priceMonthly),
      isActive: true,
    })
    .returning()

  return {
    id: tier.id,
    name: tier.name,
    slug: tier.slug,
    stripe_price_id: tier.stripePriceId,
    monthly_booking_quota: tier.monthlyBookingQuota,
    price_monthly: tier.priceMonthly,
    is_active: tier.isActive,
    created_at: tier.createdAt.toISOString(),
    updated_at: tier.updatedAt.toISOString(),
  }
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

  // Fetch Stripe price once if either name or price changed
  if (nameChanged || priceChanged) {
    const currentPrice = await stripe.prices.retrieve(current.stripePriceId)
    const productId = currentPrice.product as string

    if (nameChanged) {
      dbUpdates.name = updates.name
      dbUpdates.slug = slugify(updates.name!)
      await stripe.products.update(productId, { name: updates.name! })
    }

    if (priceChanged) {
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(updates.priceMonthly! * 100),
        currency: 'usd',
        recurring: { interval: 'month' },
      })
      await stripe.prices.update(current.stripePriceId, { active: false })
      dbUpdates.stripePriceId = newPrice.id
      dbUpdates.priceMonthly = String(updates.priceMonthly)
    }
  }

  if (updates.monthlyBookingQuota !== undefined) {
    dbUpdates.monthlyBookingQuota = updates.monthlyBookingQuota
  }

  if (updates.isActive !== undefined) {
    dbUpdates.isActive = updates.isActive
  }

  const [updated] = await db
    .update(membershipTiers)
    .set(dbUpdates)
    .where(eq(membershipTiers.id, tierId))
    .returning()

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    stripe_price_id: updated.stripePriceId,
    monthly_booking_quota: updated.monthlyBookingQuota,
    price_monthly: updated.priceMonthly,
    is_active: updated.isActive,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
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

export async function archiveTier(db: DrizzleInstance, tierId: string) {
  // Check for active subscribers and fetch tier in parallel
  const [[{ value: activeCount }], tier] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(eq(profiles.membershipTierId, tierId)),
    db.query.membershipTiers.findFirst({ where: eq(membershipTiers.id, tierId) }),
  ])

  if (!tier) return null

  if (activeCount > 0) {
    throw new Error(`Cannot archive tier with ${activeCount} active subscriber(s)`)
  }

  // Archive Stripe Price
  await stripe.prices.update(tier.stripePriceId, { active: false })

  // Set inactive in DB
  const [updated] = await db
    .update(membershipTiers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(membershipTiers.id, tierId))
    .returning({ id: membershipTiers.id })

  return updated
}
