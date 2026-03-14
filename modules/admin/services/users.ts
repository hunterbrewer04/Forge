/**
 * Admin user management service
 *
 * listUsers  — paginated, filterable list of all profiles with membership tier
 * getUser    — single user detail including Stripe fields
 * updateUserRoles — patch role flags on a profile
 * deactivateUser  — soft deactivate by stripping all access flags
 */

import { eq, and, or, ilike, count, desc } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'
import type { DrizzleInstance } from '../config'
import type { UserFilters, RoleUpdate } from '../types'

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&')
}

type ProfileWithTier = {
  id: string
  clerkUserId: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  isTrainer: boolean
  isAdmin: boolean
  isMember: boolean
  hasFullAccess: boolean
  membershipStatus: string | null
  createdAt: Date
  membershipTier: { id: string; name: string } | null
}

function toUserListResponse(u: ProfileWithTier) {
  return {
    id: u.id,
    clerk_user_id: u.clerkUserId,
    full_name: u.fullName,
    email: u.email,
    avatar_url: u.avatarUrl,
    is_trainer: u.isTrainer,
    is_admin: u.isAdmin,
    is_member: u.isMember,
    has_full_access: u.hasFullAccess,
    membership_status: u.membershipStatus,
    membership_tier: u.membershipTier
      ? { id: u.membershipTier.id, name: u.membershipTier.name }
      : null,
    created_at: u.createdAt.toISOString(),
  }
}

export async function listUsers(
  db: DrizzleInstance,
  filters: UserFilters = {}
) {
  const { search, role, limit = 20, offset = 0 } = filters

  const conditions: SQL[] = []

  if (search) {
    const escaped = escapeLike(search)
    conditions.push(
      or(
        ilike(profiles.fullName, `%${escaped}%`),
        ilike(profiles.email, `%${escaped}%`)
      )!
    )
  }

  if (role === 'trainer') conditions.push(eq(profiles.isTrainer, true))
  else if (role === 'admin') conditions.push(eq(profiles.isAdmin, true))
  else if (role === 'member') conditions.push(eq(profiles.isMember, true))
  else if (role === 'full_access') conditions.push(eq(profiles.hasFullAccess, true))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [users, [{ value: total }]] = await Promise.all([
    db.query.profiles.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(profiles.createdAt)],
      with: {
        membershipTier: {
          columns: { id: true, name: true },
        },
      },
    }),
    db.select({ value: count() }).from(profiles).where(where),
  ])

  return {
    data: users.map(toUserListResponse),
    total,
    limit,
    offset,
  }
}

export async function getUser(db: DrizzleInstance, userId: string) {
  const user = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    with: {
      membershipTier: {
        columns: { id: true, name: true },
      },
    },
  })

  if (!user) return null

  return {
    ...toUserListResponse(user),
    stripe_customer_id: user.stripeCustomerId,
    stripe_subscription_id: user.stripeSubscriptionId,
    updated_at: user.updatedAt.toISOString(),
  }
}

export async function updateUserRoles(
  db: DrizzleInstance,
  userId: string,
  roleUpdates: RoleUpdate
) {
  const [updated] = await db
    .update(profiles)
    .set({
      ...roleUpdates,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning({ id: profiles.id })

  return updated ?? null
}

export async function deactivateUser(db: DrizzleInstance, userId: string) {
  // Soft deactivate: remove all access flags
  const [updated] = await db
    .update(profiles)
    .set({
      isTrainer: false,
      isMember: false,
      hasFullAccess: false,
      isAdmin: false,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning({ id: profiles.id })

  return updated ?? null
}
