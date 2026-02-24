/**
 * API Route Authentication Utilities (Phase 2)
 *
 * Provides auth validation helpers for Next.js API routes
 * Uses server-side Supabase clients from Phase 1
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { User } from '@supabase/supabase-js'
import { env } from '@/lib/env-validation'
import { createApiError } from './errors'

/**
 * Validates authentication for API routes
 *
 * @param request - Next.js request object
 * @returns User object if authenticated, NextResponse error if not
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await validateAuth(request)
 *   if (authResult instanceof NextResponse) {
 *     return authResult // Return error response
 *   }
 *   const user = authResult
 *   // Continue with authenticated request...
 * }
 * ```
 */
export async function validateAuth(
  request: NextRequest
): Promise<User | NextResponse> {
  try {
    // Create server client with cookie handling
    const supabase = createServerClient(
      env.supabaseUrl(),
      env.supabaseAnonKey(),
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // No-op for API routes - cookies are set by proxy
          },
          remove() {
            // No-op for API routes - cookies are removed by proxy
          },
        },
      }
    )

    // Get user from session
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('Auth validation error:', error.message)
      return createApiError(
        'Authentication failed',
        401,
        'AUTHENTICATION_FAILED'
      )
    }

    if (!user) {
      return createApiError(
        'Unauthorized - No valid session',
        401,
        'NO_SESSION'
      )
    }

    return user
  } catch (error) {
    console.error('Unexpected auth validation error:', error)
    return createApiError(
      'Internal server error during authentication',
      500,
      'AUTH_INTERNAL_ERROR'
    )
  }
}

/**
 * Validates that the authenticated user has a specific role
 *
 * @param request - Next.js request object
 * @param requiredRole - Role required ('trainer', 'client', or 'admin')
 * @returns User object if authorized, NextResponse error if not
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await validateRole(request, 'trainer')
 *   if (authResult instanceof NextResponse) {
 *     return authResult
 *   }
 *   // User is authenticated and is a trainer
 * }
 * ```
 */
export async function validateRole(
  request: NextRequest,
  requiredRole: 'trainer' | 'client' | 'admin'
): Promise<User | NextResponse> {
  const authResult = await validateAuth(request)

  if (authResult instanceof NextResponse) {
    return authResult
  }

  const user = authResult

  try {
    // Create server client to fetch profile
    const supabase = createServerClient(
      env.supabaseUrl(),
      env.supabaseAnonKey(),
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_trainer, has_full_access, is_member, is_admin')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return createApiError(
        'Failed to verify user role',
        500,
        'ROLE_VERIFICATION_FAILED'
      )
    }

    if (!profile) {
      return createApiError(
        'User profile not found',
        404,
        'PROFILE_NOT_FOUND'
      )
    }

    // Check if user has required role
    const hasRole =
      (requiredRole === 'trainer' && profile.is_trainer) ||
      (requiredRole === 'client' && (profile.has_full_access || profile.is_member)) ||
      (requiredRole === 'admin' && profile.is_admin)

    if (!hasRole) {
      return createApiError(
        `Forbidden - Requires ${requiredRole} role`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      )
    }

    return user
  } catch (error) {
    console.error('Unexpected role validation error:', error)
    return createApiError(
      'Internal server error during role validation',
      500,
      'ROLE_VALIDATION_ERROR'
    )
  }
}
