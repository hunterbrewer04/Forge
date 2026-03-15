import { and, eq, isNotNull, type SQL } from 'drizzle-orm'
import { profiles } from './schema'

/** SQL condition: profile has an active Stripe subscription (not complimentary access) */
export const isPayingSubscriber: SQL = and(
  eq(profiles.membershipStatus, 'active'),
  isNotNull(profiles.stripeSubscriptionId)
)!

/** In-memory check: row has an active Stripe subscription */
export function isPayingClient(row: { membershipStatus: string | null; stripeSubscriptionId: string | null }): boolean {
  return row.membershipStatus === 'active' && row.stripeSubscriptionId !== null
}
