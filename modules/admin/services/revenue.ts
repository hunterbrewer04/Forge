import { eq, count, and, gte } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'
import type { DrizzleInstance } from '../config'

export async function getRevenueStats(db: DrizzleInstance) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    [{ value: totalMembers }],
    [{ value: totalTrainers }],
    [{ value: activeSubscriptions }],
    [{ value: newThisMonth }],
  ] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(eq(profiles.isMember, true)),
    db.select({ value: count() }).from(profiles).where(eq(profiles.isTrainer, true)),
    db.select({ value: count() }).from(profiles).where(eq(profiles.membershipStatus, 'active')),
    db.select({ value: count() }).from(profiles).where(
      and(eq(profiles.isMember, true), gte(profiles.createdAt, startOfMonth))
    ),
  ])

  // Calculate MRR from active subscriptions joined with tier prices
  const activeWithTiers = await db.query.profiles.findMany({
    where: eq(profiles.membershipStatus, 'active'),
    columns: { membershipTierId: true },
    with: {
      membershipTier: {
        columns: { priceMonthly: true },
      },
    },
  })

  const mrr = activeWithTiers.reduce((sum, p) => {
    return sum + (p.membershipTier ? parseFloat(p.membershipTier.priceMonthly) : 0)
  }, 0)

  return {
    mrr,
    active_subscriptions: activeSubscriptions,
    total_members: totalMembers,
    total_trainers: totalTrainers,
    new_this_month: newThisMonth,
  }
}
