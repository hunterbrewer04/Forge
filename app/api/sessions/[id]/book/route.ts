/**
 * Session Booking API Route
 *
 * POST /api/sessions/[id]/book - Book a session
 *
 * Uses atomic database function to prevent race conditions
 * and ensure capacity limits are respected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { env } from '@/lib/env-validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/sessions/[id]/book
 *
 * Books the authenticated user into the session.
 * Uses the atomic book_session database function.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params

    // 1. Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit (stricter for booking to prevent abuse)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.BOOKING,
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

    // 4. Get session info for audit logging
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, starts_at, trainer_id')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching session:', sessionError)
      return createApiError('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // 4b. Prevent booking past sessions (Issue #7 - defensive API layer check)
    if (new Date(session.starts_at) <= new Date()) {
      return createApiError(
        'Cannot book a session that has already started',
        400,
        'SESSION_STARTED'
      )
    }

    // 4c. Prevent trainer from booking their own sessions (BRE-16)
    if (user.id === session.trainer_id) {
      return createApiError(
        'Trainers cannot book their own sessions',
        403,
        'TRAINER_SELF_BOOKING'
      )
    }

    // 5. Call atomic booking function
    const { data: bookingResult, error: bookingError } = await supabase.rpc(
      'book_session',
      {
        p_session_id: sessionId,
        p_client_id: user.id,
      }
    )

    if (bookingError) {
      console.error('Error booking session:', bookingError)
      return createApiError('Failed to book session', 500, 'DATABASE_ERROR')
    }

    // 6. Check booking result
    const result = bookingResult?.[0]

    if (!result?.success) {
      const errorMessage = result?.error_message || 'Failed to book session'

      // Map error messages to appropriate HTTP status codes
      if (errorMessage.includes('not found')) {
        return createApiError(errorMessage, 404, 'RESOURCE_NOT_FOUND')
      }
      if (errorMessage.includes('already booked')) {
        return createApiError(errorMessage, 409, 'ALREADY_BOOKED')
      }
      if (errorMessage.includes('fully booked')) {
        return createApiError(errorMessage, 409, 'SESSION_FULL')
      }
      if (errorMessage.includes('not available')) {
        return createApiError(errorMessage, 400, 'SESSION_NOT_AVAILABLE')
      }

      return createApiError(errorMessage, 400, 'BOOKING_FAILED')
    }

    // 7. Fetch the created booking with details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        session:sessions(
          id,
          title,
          starts_at,
          ends_at,
          location,
          session_type:session_types(*)
        )
      `)
      .eq('id', result.booking_id)
      .single()

    if (fetchError) {
      console.error('Error fetching booking:', fetchError)
      // Booking was created, but we couldn't fetch it - still return success
      return NextResponse.json({
        success: true,
        data: {
          id: result.booking_id,
          session_id: sessionId,
          client_id: user.id,
          status: 'confirmed',
        },
        message: 'Session booked successfully',
      }, { status: 201 })
    }

    // 8. Log audit event
    await logAuditEventFromRequest({
      userId: user.id,
      action: 'BOOKING_CREATE',
      resource: 'booking',
      resourceId: result.booking_id,
      metadata: {
        session_id: sessionId,
        session_title: session.title,
        session_starts_at: session.starts_at,
        trainer_id: session.trainer_id,
      },
    })

    // 9. Handle FK join format
    const sessionData = Array.isArray(booking.session)
      ? booking.session[0] || null
      : booking.session

    if (sessionData?.session_type) {
      sessionData.session_type = Array.isArray(sessionData.session_type)
        ? sessionData.session_type[0] || null
        : sessionData.session_type
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        session: sessionData,
      },
      message: 'Session booked successfully',
    }, { status: 201 })
  } catch (error) {
    return handleUnexpectedError(error, 'session-book')
  }
}
