/**
 * API Route Authentication Utilities — Clerk
 *
 * All API routes call validateAuth() or validateRole() at the top.
 * Both resolve the Clerk JWT and look up the profile via Drizzle.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createApiError } from './errors'

export interface AuthContext {
  clerkUserId: string
  profileId: string  // profiles.id UUID — used for all FK queries
}

/**
 * Validates authentication for API routes.
 * Returns AuthContext with clerkUserId + profileId, or NextResponse error.
 */
export async function validateAuth(): Promise<AuthContext | NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return createApiError('Unauthorized — no valid session', 401, 'NO_SESSION')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, userId),
      columns: { id: true },
    })

    if (!profile) {
      console.error('Profile lookup failed for clerk_user_id:', userId)
      return createApiError('User profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    return { clerkUserId: userId, profileId: profile.id }
  } catch (err) {
    console.error('Unexpected auth validation error:', err)
    return createApiError('Internal server error during authentication', 500, 'AUTH_INTERNAL_ERROR')
  }
}

/**
 * Validates auth + role in a single profile query.
 */
export async function validateRole(
  requiredRole: 'trainer' | 'client' | 'admin'
): Promise<AuthContext | NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return createApiError('Unauthorized — no valid session', 401, 'NO_SESSION')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, userId),
      columns: {
        id: true,
        isTrainer: true,
        hasFullAccess: true,
        isMember: true,
        isAdmin: true,
      },
    })

    if (!profile) {
      console.error('Profile lookup failed for clerk_user_id:', userId)
      return createApiError('User profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    const hasRole =
      (requiredRole === 'trainer' && profile.isTrainer) ||
      (requiredRole === 'client' && (profile.hasFullAccess || profile.isMember)) ||
      (requiredRole === 'admin' && profile.isAdmin)

    if (!hasRole) {
      return createApiError(
        `Forbidden — requires ${requiredRole} role`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      )
    }

    return { clerkUserId: userId, profileId: profile.id }
  } catch (err) {
    console.error('Unexpected role validation error:', err)
    return createApiError('Internal server error during role validation', 500, 'ROLE_VALIDATION_ERROR')
  }
}
