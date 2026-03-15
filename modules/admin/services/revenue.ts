import { eq, sql } from 'drizzle-orm'
import { profiles, membershipTiers } from '@/lib/db/schema'
import { isPayingSubscriber } from '@/lib/db/conditions'
import type { DrizzleInstance } from '../config'

export async function getRevenueStats(db: DrizzleInstance) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [row] = await db.select({
      totalMembers: sql<number>`count(*) filter (where ${profiles.isMember} = true)`.mapWith(Number),
      totalTrainers: sql<number>`count(*) filter (where ${profiles.isTrainer} = true)`.mapWith(Number),
      activeSubscriptions: sql<number>`count(*) filter (where ${isPayingSubscriber})`.mapWith(Number),
      newThisMonth: sql<number>`count(*) filter (where ${profiles.isMember} = true and ${profiles.createdAt} >= ${startOfMonth})`.mapWith(Number),
      mrr: sql<number>`coalesce(sum(${membershipTiers.priceMonthly}::numeric) filter (where ${isPayingSubscriber}), 0)`.mapWith(Number),
    })
      .from(profiles)
      .leftJoin(membershipTiers, eq(profiles.membershipTierId, membershipTiers.id))

    return {
      mrr: row.mrr,
      active_subscriptions: row.activeSubscriptions,
      total_members: row.totalMembers,
      total_trainers: row.totalTrainers,
      new_this_month: row.newThisMonth,
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
