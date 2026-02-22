/**
 * Public Session Types API (v1)
 *
 * GET /api/v1/session-types - List all active session types (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/v1/session-types
 *
 * Returns all session types with public fields only.
 * No authentication required — rate limited by IP address.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limit check (IP-based, no userId)
    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Query session types via admin client (bypasses RLS)
    const supabase = getAdminClient()

    const { data: sessionTypes, error } = await supabase
      .from('session_types')
      .select('id, name, slug, color, icon, is_premium')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching session types:', error)
      return createApiError('Failed to fetch session types', 500, 'DATABASE_ERROR')
    }

    // 3. Return public session types
    return NextResponse.json({
      success: true,
      sessionTypes: sessionTypes || [],
    })
  } catch (error) {
    return handleUnexpectedError(error, 'v1-session-types-list')
  }
}
