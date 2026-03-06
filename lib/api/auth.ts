/**
 * API Route Authentication Utilities — Clerk
 *
 * All API routes call validateAuth() or validateRole() at the top.
 * Both resolve the Clerk JWT and look up the Supabase profile in a single query.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { createApiError } from './errors'

export interface AuthContext {
  clerkUserId: string
  profileId: string  // Supabase profiles.id UUID — used for all FK queries
}

interface BaseProfile {
  id: string
}

interface RoleProfile extends BaseProfile {
  is_trainer: boolean
  has_full_access: boolean
  is_member: boolean
  is_admin: boolean
}

/**
 * Shared helper: verifies Clerk JWT and fetches profile columns in one query.
 */
async function resolveAuth<T extends BaseProfile>(
  select: string
): Promise<{ clerkUserId: string; profile: T } | NextResponse> {
  const { userId } = await auth()

  if (!userId) {
    return createApiError('Unauthorized — no valid session', 401, 'NO_SESSION')
  }

  const supabase = getAdminClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(select)
    .eq('clerk_user_id', userId)
    .single()

  if (error || !profile) {
    console.error('Profile lookup failed for clerk_user_id:', userId, error)
    return createApiError('User profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  return { clerkUserId: userId, profile: profile as T }
}

/**
 * Validates authentication for API routes.
 * Returns AuthContext with clerkUserId + profileId, or NextResponse error.
 */
export async function validateAuth(): Promise<AuthContext | NextResponse> {
  try {
    const result = await resolveAuth<BaseProfile>('id')
    if (result instanceof NextResponse) return result
    return { clerkUserId: result.clerkUserId, profileId: result.profile.id }
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
    const result = await resolveAuth<RoleProfile>('id, is_trainer, has_full_access, is_member, is_admin')
    if (result instanceof NextResponse) return result

    const { profile } = result
    const hasRole =
      (requiredRole === 'trainer' && profile.is_trainer) ||
      (requiredRole === 'client' && (profile.has_full_access || profile.is_member)) ||
      (requiredRole === 'admin' && profile.is_admin)

    if (!hasRole) {
      return createApiError(
        `Forbidden — requires ${requiredRole} role`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      )
    }

    return { clerkUserId: result.clerkUserId, profileId: profile.id }
  } catch (err) {
    console.error('Unexpected role validation error:', err)
    return createApiError('Internal server error during role validation', 500, 'ROLE_VALIDATION_ERROR')
  }
}
