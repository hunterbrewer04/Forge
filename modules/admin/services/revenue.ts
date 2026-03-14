import { eq, sql } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'
import type { DrizzleInstance } from '../config'

export async function getRevenueStats(db: DrizzleInstance) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Single pass over profiles for all four counts, plus MRR join — both run in parallel
  const [statsRows, activeWithTiers] = await Promise.all([
    db.select({
      totalMembers: sql<number>`count(*) filter (where ${profiles.isMember} = true)`.mapWith(Number),
      totalTrainers: sql<number>`count(*) filter (where ${profiles.isTrainer} = true)`.mapWith(Number),
      activeSubscriptions: sql<number>`count(*) filter (where ${profiles.membershipStatus} = 'active')`.mapWith(Number),
      newThisMonth: sql<number>`count(*) filter (where ${profiles.isMember} = true and ${profiles.createdAt} >= ${startOfMonth})`.mapWith(Number),
    }).from(profiles),

    db.query.profiles.findMany({
      where: eq(profiles.membershipStatus, 'active'),
      columns: { membershipTierId: true },
      with: {
        membershipTier: {
          columns: { priceMonthly: true },
        },
      },
    }),
  ])

  const { totalMembers, totalTrainers, activeSubscriptions, newThisMonth } = statsRows[0]

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
