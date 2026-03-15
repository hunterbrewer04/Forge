import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { profiles, membershipTiers } from '@/lib/db/schema'
import type { DrizzleInstance } from '../config'

export async function getRevenueStats(db: DrizzleInstance) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Single pass over profiles for all four counts, plus MRR join — both run in parallel
    const [statsRows, mrrRows] = await Promise.all([
      db.select({
        totalMembers: sql<number>`count(*) filter (where ${profiles.isMember} = true)`.mapWith(Number),
        totalTrainers: sql<number>`count(*) filter (where ${profiles.isTrainer} = true)`.mapWith(Number),
        activeSubscriptions: sql<number>`count(*) filter (where ${profiles.membershipStatus} = 'active' and ${profiles.stripeSubscriptionId} is not null)`.mapWith(Number),
        newThisMonth: sql<number>`count(*) filter (where ${profiles.isMember} = true and ${profiles.createdAt} >= ${startOfMonth})`.mapWith(Number),
      }).from(profiles),

      db.select({
        mrr: sql<number>`coalesce(sum(${membershipTiers.priceMonthly}::numeric), 0)`.mapWith(Number),
      })
        .from(profiles)
        .innerJoin(membershipTiers, eq(profiles.membershipTierId, membershipTiers.id))
        .where(and(eq(profiles.membershipStatus, 'active'), isNotNull(profiles.stripeSubscriptionId))),
    ])

    const { totalMembers, totalTrainers, activeSubscriptions, newThisMonth } = statsRows[0]

    return {
      mrr: mrrRows[0].mrr,
      active_subscriptions: activeSubscriptions,
      total_members: totalMembers,
      total_trainers: totalTrainers,
      new_this_month: newThisMonth,
    }
  } catch (err) {
    console.error('Failed to compute revenue stats:', err)
    return {
      mrr: 0,
      active_subscriptions: 0,
      total_members: 0,
      total_trainers: 0,
      new_this_month: 0,
    }
  }
}
