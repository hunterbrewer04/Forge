import { eq } from 'drizzle-orm'
import { trainerClients, profiles, membershipTiers } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe'
import type { DrizzleInstance } from '../config'
import type { TrainerEarningsBase, TrainerClientItem, MonthlyRevenue } from '../types'

export async function getTrainerEarnings(
  db: DrizzleInstance,
  trainerId: string
): Promise<TrainerEarningsBase> {
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      membershipStatus: profiles.membershipStatus,
      stripeSubscriptionId: profiles.stripeSubscriptionId,
      hasFullAccess: profiles.hasFullAccess,
      tierName: membershipTiers.name,
      priceMonthly: membershipTiers.priceMonthly,
      assignedAt: trainerClients.assignedAt,
    })
    .from(trainerClients)
    .innerJoin(profiles, eq(trainerClients.clientId, profiles.id))
    .leftJoin(membershipTiers, eq(profiles.membershipTierId, membershipTiers.id))
    .where(eq(trainerClients.trainerId, trainerId))

  // Only count revenue from users with actual Stripe subscriptions
  const payingClients = rows.filter(
    (r) => r.membershipStatus === 'active' && r.stripeSubscriptionId !== null
  )

  const monthlyEarnings = payingClients.reduce(
    (sum, r) => sum + (r.priceMonthly ? Number(r.priceMonthly) : 0),
    0
  )

  const clients: TrainerClientItem[] = rows.map((r) => {
    const isComp = r.hasFullAccess === true && r.stripeSubscriptionId === null
    return {
      id: r.id,
      full_name: r.fullName,
      avatar_url: r.avatarUrl,
      tier_name: r.tierName,
      price_monthly: isComp ? 0 : r.priceMonthly ? Number(r.priceMonthly) : 0,
      membership_status: r.membershipStatus,
      assigned_at: r.assignedAt.toISOString(),
      is_complimentary: isComp,
    }
  })

  clients.sort((a, b) => b.price_monthly - a.price_monthly)

  return {
    monthly_earnings: monthlyEarnings,
    active_clients: payingClients.length,
    avg_per_client: payingClients.length > 0 ? monthlyEarnings / payingClients.length : 0,
    clients,
  }
}

export async function getMonthlyRevenueHistory(): Promise<MonthlyRevenue[]> {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const createdGte = Math.floor(sixMonthsAgo.getTime() / 1000)

  // Auto-paginate to handle >100 invoices in the window
  const invoices = await stripe.invoices
    .list({ status: 'paid', created: { gte: createdGte }, limit: 100 })
    .autoPagingToArray({ limit: 10_000 })

  // Build 6 monthly buckets
  const buckets = new Map<string, { label: string; amount: number }>()

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    buckets.set(key, { label, amount: 0 })
  }

  // Aggregate invoice amounts into buckets
  for (const inv of invoices) {
    if (!inv.created) continue
    const d = new Date(inv.created * 1000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.amount += (inv.amount_paid ?? 0) / 100 // cents to dollars
    }
  }

  const result: MonthlyRevenue[] = []
  for (const [month, data] of buckets) {
    result.push({ month, label: data.label, amount: data.amount })
  }

  return result
}
