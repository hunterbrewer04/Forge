/**
 * Public Sessions API Routes (v1)
 *
 * GET /api/v1/sessions - List upcoming available sessions (no auth required)
 *
 * Public endpoint for landing pages and walk-in customers who don't have accounts.
 * Returns only future scheduled sessions with availability data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateQueryParams } from '@/lib/api/validation'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * Query parameter schema for public session listing.
 * All params are optional; `date` must match YYYY-MM-DD if provided.
 */
const PublicSessionQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
})

/**
 * GET /api/v1/sessions
 *
 * Query params:
 * - date: Filter by date (YYYY-MM-DD)
 * - from: Start of date range (ISO string)
 * - to: End of date range (ISO string)
 * - type: Filter by session_type slug
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check rate limit (IP-based only — no userId)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Validate query params
    const paramsResult = await validateQueryParams(request, PublicSessionQuerySchema)
    if (paramsResult instanceof NextResponse) {
      return paramsResult
    }
    const params = paramsResult

    // 3. Get admin client to bypass RLS (no authenticated user context)
    const supabase = getAdminClient()

    // 4. Build query — always filter for scheduled, future sessions only
    let query = supabase
      .from('sessions')
      .select(`
        *,
        session_type:session_types(*),
        trainer:profiles!sessions_trainer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('status', 'scheduled')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })

    // 5. Apply date filters
    if (params.date) {
      const startOfDay = `${params.date}T00:00:00.000Z`
      const endOfDay = `${params.date}T23:59:59.999Z`
      query = query.gte('starts_at', startOfDay).lte('starts_at', endOfDay)
    } else if (params.from || params.to) {
      if (params.from) {
        query = query.gte('starts_at', params.from)
      }
      if (params.to) {
        // Add time component to include the full day
        query = query.lte('starts_at', `${params.to}T23:59:59`)
      }
    }

    // 6. Execute query
    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching public sessions:', error)
      return createApiError('Failed to fetch sessions', 500, 'DATABASE_ERROR')
    }

    // 7. Filter by session type slug if specified (post-query, using Array.isArray pattern)
    let filteredSessions = sessions || []
    if (params.type) {
      filteredSessions = filteredSessions.filter((s) => {
        const sessionType = Array.isArray(s.session_type)
          ? s.session_type[0]
          : s.session_type
        return sessionType?.slug === params.type
      })
    }

    // 8. Fetch availability in batch — single RPC instead of N queries
    const sessionIds = filteredSessions.map((s) => s.id)

    const { data: availabilityData } = sessionIds.length > 0
      ? await supabase.rpc('get_sessions_availability_batch', { p_session_ids: sessionIds })
      : { data: [] }

    // Create lookup map for O(1) access
    const availabilityMap = new Map(
      (availabilityData || []).map((a: { session_id: string; capacity: number; booked_count: number; spots_left: number; is_full: boolean }) => [a.session_id, a])
    )

    // 9. Map sessions with normalized FK joins and availability data
    const sessionsWithDetails = filteredSessions.map((session) => {
      const availability = availabilityMap.get(session.id) || {
        capacity: session.capacity || 1,
        booked_count: 0,
        spots_left: session.capacity || 1,
        is_full: false,
      }

      // Handle FK join format (Supabase can return as array or object)
      const session_type = Array.isArray(session.session_type)
        ? session.session_type[0] || null
        : session.session_type
      const trainer = Array.isArray(session.trainer)
        ? session.trainer[0] || null
        : session.trainer

      return {
        ...session,
        session_type,
        trainer,
        availability,
      }
    })

    return NextResponse.json({
      success: true,
      sessions: sessionsWithDetails,
      count: sessionsWithDetails.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'v1-sessions-list')
  }
}
