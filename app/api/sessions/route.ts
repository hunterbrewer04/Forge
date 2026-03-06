/**
 * Sessions API Routes
 *
 * GET /api/sessions - List sessions with optional filters
 * POST /api/sessions - Create a new session (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth, validateRole } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, SessionSchemas } from '@/lib/api/validation'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import type { SessionFilters } from '@/lib/types/sessions'

/**
 * GET /api/sessions
 *
 * Query params:
 * - date: Filter by date (YYYY-MM-DD)
 * - from: Start of date range (ISO string)
 * - to: End of date range (ISO string)
 * - type: Filter by session_type slug
 * - trainer_id: Filter by trainer (use "me" for current user)
 * - include_full: Include fully booked sessions (default: true)
 * - status: Filter by status (default: scheduled)
 * - types_only: If true, returns session types instead of sessions
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url)

    // Handle types_only request
    if (searchParams.get('types_only') === 'true') {
      const supabase = getAdminClient()

      const { data: sessionTypes, error } = await supabase
        .from('session_types')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching session types:', error)
        return createApiError('Failed to fetch session types', 500, 'DATABASE_ERROR')
      }

      return NextResponse.json({
        success: true,
        session_types: sessionTypes || [],
      })
    }

    // Handle trainer_id=me
    let trainerId = searchParams.get('trainer_id') || undefined
    if (trainerId === 'me') {
      trainerId = profileId
    }

    const filters: SessionFilters = {
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      type: searchParams.get('type') || undefined,
      trainer_id: trainerId,
      include_full: searchParams.get('include_full') !== 'false',
      status: (searchParams.get('status') as SessionFilters['status']) || 'scheduled',
    }

    // 4. Create Supabase client
    const supabase = getAdminClient()

    // 5. Build query
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
      .eq('status', filters.status || 'scheduled')
      .order('starts_at', { ascending: true })

    // Apply date filters
    if (filters.date) {
      const startOfDay = `${filters.date}T00:00:00.000Z`
      const endOfDay = `${filters.date}T23:59:59.999Z`
      query = query.gte('starts_at', startOfDay).lte('starts_at', endOfDay)
    } else if (filters.from || filters.to) {
      if (filters.from) {
        query = query.gte('starts_at', filters.from)
      }
      if (filters.to) {
        // Add time component to include the full day
        query = query.lte('starts_at', `${filters.to}T23:59:59`)
      }
    }

    // Filter by trainer
    if (filters.trainer_id) {
      query = query.eq('trainer_id', filters.trainer_id)
    }

    // 6. Execute query
    const { data: sessions, error } = await query

    if (error) {
      console.error('Error fetching sessions:', error)
      return createApiError('Failed to fetch sessions', 500, 'DATABASE_ERROR')
    }

    // 7. Filter by session type if specified
    let filteredSessions = sessions || []
    if (filters.type) {
      filteredSessions = filteredSessions.filter((s) => {
        const sessionType = Array.isArray(s.session_type)
          ? s.session_type[0]
          : s.session_type
        return sessionType?.slug === filters.type
      })
    }

    // 8. Fetch availability in batch (Issue #13, #14 - N+2 query optimization)
    const sessionIds = filteredSessions.map((s) => s.id)

    // Get batch availability - single query instead of N queries
    const { data: availabilityData } = sessionIds.length > 0
      ? await supabase.rpc('get_sessions_availability_batch', { p_session_ids: sessionIds })
      : { data: [] }

    // Get user bookings in batch - single query instead of N queries
    const { data: userBookings } = sessionIds.length > 0
      ? await supabase
          .from('bookings')
          .select('session_id, id, status')
          .in('session_id', sessionIds)
          .eq('client_id', profileId)
          .eq('status', 'confirmed')
      : { data: [] }

    // Create lookup maps for O(1) access
    const availabilityMap = new Map(
      (availabilityData || []).map((a: { session_id: string; capacity: number; booked_count: number; spots_left: number; is_full: boolean }) => [a.session_id, a])
    )
    const userBookingMap = new Map(
      (userBookings || []).map((b: { session_id: string; id: string; status: string }) => [b.session_id, { id: b.id, status: b.status }])
    )

    // Map sessions with availability and booking data
    const sessionsWithDetails = filteredSessions.map((session) => {
      const availability = availabilityMap.get(session.id) || {
        capacity: session.capacity || 1,
        booked_count: 0,
        spots_left: session.capacity || 1,
        is_full: false,
      }

      const userBooking = userBookingMap.get(session.id) || null

      // Handle FK join format
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
        user_booking: userBooking,
      }
    })

    // 9. Filter out full sessions if requested
    const finalSessions = filters.include_full === false
      ? sessionsWithDetails.filter((s) => !s.availability.is_full)
      : sessionsWithDetails

    return NextResponse.json({
      success: true,
      sessions: finalSessions,
      count: finalSessions.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'sessions-list')
  }
}

/**
 * POST /api/sessions
 *
 * Creates a new session. Trainer or admin only.
 *
 * Body:
 * - title: string (required)
 * - starts_at: string (required, ISO date)
 * - ends_at: string (required, ISO date)
 * - session_type_id?: string
 * - description?: string
 * - duration_minutes?: number (default: 60)
 * - capacity?: number (default: 1)
 * - is_premium?: boolean (default: false)
 * - location?: string
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate trainer role
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse and validate request body
    const bodyResult = await validateRequestBody(request, SessionSchemas.create)
    if (bodyResult instanceof NextResponse) {
      return bodyResult
    }
    const body = bodyResult

    // 4b. Validate date formats and range (Issue #10)
    const startsAt = new Date(body.starts_at)
    const endsAt = new Date(body.ends_at)

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return createApiError(
        'Invalid date format: starts_at and ends_at must be valid ISO date strings',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (endsAt <= startsAt) {
      return createApiError(
        'Invalid time range: ends_at must be after starts_at',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (startsAt <= new Date()) {
      return createApiError(
        'Cannot create sessions in the past',
        400,
        'VALIDATION_ERROR'
      )
    }

    // 5. Create Supabase client
    const supabase = getAdminClient()

    // 6. Create session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        trainer_id: profileId,
        session_type_id: body.session_type_id || null,
        title: body.title,
        description: body.description || null,
        duration_minutes: body.duration_minutes || 60,
        capacity: body.capacity ?? 1,
        is_premium: body.is_premium || false,
        location: body.location || null,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        status: 'scheduled',
      })
      .select(`
        *,
        session_type:session_types(*),
        trainer:profiles!sessions_trainer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating session:', error)
      return createApiError('Failed to create session', 500, 'DATABASE_ERROR')
    }

    // 7. Log audit event
    await logAuditEventFromRequest({
      userId: profileId,
      action: 'SESSION_CREATE',
      resource: 'session',
      resourceId: session.id,
      metadata: {
        title: session.title,
        starts_at: session.starts_at,
        capacity: session.capacity,
      },
    })

    // 8. Handle FK join format
    const session_type = Array.isArray(session.session_type)
      ? session.session_type[0] || null
      : session.session_type
    const trainer = Array.isArray(session.trainer)
      ? session.trainer[0] || null
      : session.trainer

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        session_type,
        trainer,
      },
    }, { status: 201 })
  } catch (error) {
    return handleUnexpectedError(error, 'sessions-create')
  }
}
