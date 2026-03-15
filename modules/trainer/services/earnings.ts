import { eq } from 'drizzle-orm'
import { trainerClients, profiles, membershipTiers } from '@/lib/db/schema'
import { isPayingClient } from '@/lib/db/conditions'
import { centsToDollars } from '@/lib/utils/currency'
import type Stripe from 'stripe'
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
  const payingClients = rows.filter(isPayingClient)

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

// Best-effort in-memory cache. On Vercel serverless, this persists only within warm
// Lambda instances — cold starts reset it. The promise dedup prevents concurrent
// requests from stampeding the Stripe API on the same instance.
let revenueCache: { data: MonthlyRevenue[]; ts: number } | null = null
let revenuePending: Promise<MonthlyRevenue[]> | null = null
const REVENUE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetches facility-wide monthly revenue from Stripe paid invoices for the last 6 months.
 *
 * Note: This returns revenue across ALL customers, not scoped to a specific trainer's
 * clients. This is intentional for single-trainer facilities. For multi-trainer support,
 * this would need to filter by customer IDs belonging to the trainer's assigned clients.
 */
export async function getMonthlyRevenueHistory(stripeClient: Stripe): Promise<MonthlyRevenue[]> {
  if (revenueCache && Date.now() - revenueCache.ts < REVENUE_CACHE_TTL) {
    return revenueCache.data
  }
  if (revenuePending) return revenuePending

  revenuePending = fetchRevenueHistory(stripeClient).finally(() => { revenuePending = null })
  return revenuePending
}

async function fetchRevenueHistory(stripeClient: Stripe): Promise<MonthlyRevenue[]> {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const createdGte = Math.floor(sixMonthsAgo.getTime() / 1000)

  // Auto-paginate to handle >100 invoices in the window
  const invoices = await stripeClient.invoices
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
      bucket.amount += centsToDollars(inv.amount_paid ?? 0)
    }
  }

  const result: MonthlyRevenue[] = []
  for (const [month, data] of buckets) {
    result.push({ month, label: data.label, amount: data.amount })
  }

  revenueCache = { data: result, ts: Date.now() }
  return result
}
