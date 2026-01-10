/**
 * Session Detail API Routes
 *
 * GET /api/sessions/[id] - Get a single session
 * PATCH /api/sessions/[id] - Update a session (trainer only)
 * DELETE /api/sessions/[id] - Cancel/delete a session (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { env } from '@/lib/env-validation'
import type { UpdateSessionInput } from '@/lib/types/sessions'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sessions/[id]
 *
 * Returns a single session with details
 * Query params:
 * - include_bookings: If true, includes all bookings for the session (trainer only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeBookings = searchParams.get('include_bookings') === 'true'

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

    // 3. Create Supabase client
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

    // 4. Fetch session
    const { data: session, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching session:', error)
      return createApiError('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // 5. Get availability
    const { data: availabilityData } = await supabase.rpc(
      'get_session_availability',
      { p_session_id: id }
    )
    const availability = availabilityData?.[0] || {
      capacity: session.capacity || 1,
      booked_count: 0,
      spots_left: session.capacity || 1,
      is_full: false,
    }

    // 6. Check if current user has a booking
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('id, status, booked_at')
      .eq('session_id', id)
      .eq('client_id', user.id)
      .eq('status', 'confirmed')
      .maybeSingle()

    // 7. Handle FK join format
    const session_type = Array.isArray(session.session_type)
      ? session.session_type[0] || null
      : session.session_type
    const trainer = Array.isArray(session.trainer)
      ? session.trainer[0] || null
      : session.trainer

    // 8. Fetch bookings if requested (trainer only)
    let bookings = null
    if (includeBookings && session.trainer_id === user.id) {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('session_id', id)
        .order('booked_at', { ascending: true })

      bookings = (bookingsData || []).map((booking) => {
        const client = Array.isArray(booking.client)
          ? booking.client[0] || null
          : booking.client
        return { ...booking, client }
      })
    }

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        session_type,
        trainer,
        availability,
        user_booking: bookingData,
      },
      bookings,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-get')
  }
}

/**
 * PATCH /api/sessions/[id]
 *
 * Updates a session. Only the trainer who created it (or admin) can update.
 *
 * Body:
 * - title?: string
 * - description?: string
 * - session_type_id?: string
 * - duration_minutes?: number
 * - capacity?: number
 * - is_premium?: boolean
 * - location?: string
 * - starts_at?: string
 * - ends_at?: string
 * - status?: 'scheduled' | 'cancelled' | 'completed'
 * - cancellation_reason?: string
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    // 3. Parse request body
    let body: UpdateSessionInput
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
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

    // 5. Check if session exists and user has permission
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessions')
      .select('id, trainer_id, title, starts_at, ends_at')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching session:', fetchError)
      return createApiError('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // 6. Check user has permission (trainer or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isOwner = existingSession.trainer_id === user.id
    const isAdmin = profile?.is_admin === true

    if (!isOwner && !isAdmin) {
      return createApiError(
        'You do not have permission to update this session',
        403,
        'FORBIDDEN'
      )
    }

    // 6b. Validate date range when starts_at or ends_at is updated (Issue #8)
    if (body.starts_at !== undefined || body.ends_at !== undefined) {
      const newStartsAt = body.starts_at ? new Date(body.starts_at) : new Date(existingSession.starts_at)
      const newEndsAt = body.ends_at ? new Date(body.ends_at) : new Date(existingSession.ends_at)

      if (Number.isNaN(newStartsAt.getTime()) || Number.isNaN(newEndsAt.getTime())) {
        return createApiError(
          'Invalid date format: dates must be valid ISO strings',
          400,
          'VALIDATION_ERROR'
        )
      }

      if (newEndsAt <= newStartsAt) {
        return createApiError(
          'Invalid time range: ends_at must be after starts_at',
          400,
          'INVALID_TIME_RANGE'
        )
      }
    }

    // 6c. Validate capacity reduction (Issue #9)
    if (body.capacity !== undefined) {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', id)
        .eq('status', 'confirmed')

      if (body.capacity < (count || 0)) {
        return createApiError(
          `Cannot reduce capacity below ${count} confirmed bookings`,
          400,
          'INVALID_CAPACITY'
        )
      }
    }

    // 7. Build update object
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.session_type_id !== undefined) updateData.session_type_id = body.session_type_id
    if (body.duration_minutes !== undefined) updateData.duration_minutes = body.duration_minutes
    if (body.capacity !== undefined) updateData.capacity = body.capacity
    if (body.is_premium !== undefined) updateData.is_premium = body.is_premium
    if (body.location !== undefined) updateData.location = body.location
    if (body.starts_at !== undefined) updateData.starts_at = body.starts_at
    if (body.ends_at !== undefined) updateData.ends_at = body.ends_at
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }
    }
    if (body.cancellation_reason !== undefined) updateData.cancellation_reason = body.cancellation_reason

    // 8. Update session
    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating session:', updateError)
      return createApiError('Failed to update session', 500, 'DATABASE_ERROR')
    }

    // 9. Log audit event
    const auditAction = body.status === 'cancelled' ? 'SESSION_CANCEL' : 'SESSION_UPDATE'
    await logAuditEventFromRequest({
      userId: user.id,
      action: auditAction,
      resource: 'session',
      resourceId: id,
      metadata: {
        changes: Object.keys(updateData),
        status: body.status,
      },
    })

    // 10. Handle FK join format
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
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-update')
  }
}

/**
 * DELETE /api/sessions/[id]
 *
 * Deletes a session. Only the trainer who created it (or admin) can delete.
 * Consider using PATCH with status='cancelled' instead to preserve history.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

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

    // 3. Create Supabase client
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

    // 4. Check if session exists and user has permission
    const { data: existingSession, error: fetchError } = await supabase
      .from('sessions')
      .select('id, trainer_id, title')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching session:', fetchError)
      return createApiError('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // 5. Check user has permission (trainer or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isOwner = existingSession.trainer_id === user.id
    const isAdmin = profile?.is_admin === true

    if (!isOwner && !isAdmin) {
      return createApiError(
        'You do not have permission to delete this session',
        403,
        'FORBIDDEN'
      )
    }

    // 6. Delete session
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return createApiError('Failed to delete session', 500, 'DATABASE_ERROR')
    }

    // 7. Log audit event
    await logAuditEventFromRequest({
      userId: user.id,
      action: 'SESSION_DELETE',
      resource: 'session',
      resourceId: id,
      metadata: {
        title: existingSession.title,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-delete')
  }
}
