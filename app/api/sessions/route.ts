/**
 * Sessions API Routes
 *
 * GET /api/sessions - List sessions with optional filters
 * POST /api/sessions - Create a new session (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth, validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { env } from '@/lib/env-validation'
import type { SessionFilters, CreateSessionInput } from '@/lib/types/sessions'

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
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse query params
    const { searchParams } = new URL(request.url)

    // Handle types_only request
    if (searchParams.get('types_only') === 'true') {
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
      trainerId = user.id
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
        query = query.lte('starts_at', filters.to)
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

    // 8. Fetch availability for each session
    const sessionsWithDetails = await Promise.all(
      filteredSessions.map(async (session) => {
        // Get availability
        const { data: availabilityData } = await supabase.rpc(
          'get_session_availability',
          { p_session_id: session.id }
        )
        const availability = availabilityData?.[0] || {
          capacity: session.capacity || 1,
          booked_count: 0,
          spots_left: session.capacity || 1,
          is_full: false,
        }

        // Check if current user has a booking
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('session_id', session.id)
          .eq('client_id', user.id)
          .eq('status', 'confirmed')
          .maybeSingle()

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
          user_booking: bookingData,
        }
      })
    )

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
    const authResult = await validateRole(request, 'trainer')
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse request body
    let body: CreateSessionInput
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    // 4. Validate required fields
    if (!body.title || !body.starts_at || !body.ends_at) {
      return createApiError(
        'Missing required fields: title, starts_at, ends_at',
        400,
        'VALIDATION_ERROR'
      )
    }

    // 5. Create Supabase client
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

    // 6. Create session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        trainer_id: user.id,
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
      userId: user.id,
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
