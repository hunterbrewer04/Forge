/**
 * API Route Authentication Utilities — Clerk
 *
 * Replaces Supabase session-based auth with Clerk JWT verification.
 * All API routes call validateAuth() or validateRole() at the top.
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createApiError } from './errors'

export interface AuthContext {
  clerkUserId: string
  profileId: string  // Supabase profiles.id UUID — used for all FK queries
}

/**
 * Validates authentication for API routes.
 * Returns AuthContext with clerkUserId + profileId, or NextResponse 401.
 */
export async function validateAuth(): Promise<AuthContext | NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return createApiError('Unauthorized — no valid session', 401, 'NO_SESSION')
    }

    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      console.error('Profile lookup failed for clerk_user_id:', userId, error)
      return createApiError('User profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    return { clerkUserId: userId, profileId: profile.id }
  } catch (err) {
    console.error('Unexpected auth validation error:', err)
    return createApiError('Internal server error during authentication', 500, 'AUTH_INTERNAL_ERROR')
  }
}

/**
 * Validates auth + role for API routes.
 * Fetches is_trainer / is_admin / has_full_access from profiles table.
 */
export async function validateRole(
  requiredRole: 'trainer' | 'client' | 'admin'
): Promise<AuthContext | NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return createApiError('Unauthorized — no valid session', 401, 'NO_SESSION')
    }

    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, is_trainer, has_full_access, is_member, is_admin')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      console.error('Profile lookup failed for clerk_user_id:', userId, error)
      return createApiError('User profile not found', 404, 'PROFILE_NOT_FOUND')
    }

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

    return { clerkUserId: userId, profileId: profile.id }
  } catch (err) {
    console.error('Unexpected role validation error:', err)
    return createApiError('Internal server error during role validation', 500, 'ROLE_VALIDATION_ERROR')
  }
}
