/**
 * Booking Detail API Routes
 *
 * GET /api/bookings/[id] - Get a single booking
 * PATCH /api/bookings/[id] - Cancel a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { BookingSchemas } from '@/lib/api/validation'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { env } from '@/lib/env-validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bookings/[id]
 *
 * Returns a single booking with session details.
 * Only the booking owner, session trainer, or admin can view.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 4. Fetch booking (RLS will handle access control)
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        session:sessions(
          *,
          session_type:session_types(*),
          trainer:profiles!sessions_trainer_id_fkey(
            id,
            full_name,
            avatar_url
          )
        ),
        client:profiles!bookings_client_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createApiError('Booking not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching booking:', error)
      return createApiError('Failed to fetch booking', 500, 'DATABASE_ERROR')
    }

    // 5. Handle FK join format
    const session = Array.isArray(booking.session)
      ? booking.session[0] || null
      : booking.session

    if (session) {
      session.session_type = Array.isArray(session.session_type)
        ? session.session_type[0] || null
        : session.session_type
      session.trainer = Array.isArray(session.trainer)
        ? session.trainer[0] || null
        : session.trainer
    }

    const client = Array.isArray(booking.client)
      ? booking.client[0] || null
      : booking.client

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        session,
        client,
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'booking-get')
  }
}

/**
 * PATCH /api/bookings/[id]
 *
 * Cancels a booking.
 * Only the booking owner, session trainer, or admin can cancel.
 *
 * Body:
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
      RateLimitPresets.BOOKING,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse and validate request body
    let body: { cancellation_reason?: string | null } = {}
    try {
      const text = await request.text()
      if (text) {
        const parsed = JSON.parse(text)
        const result = BookingSchemas.cancel.safeParse(parsed)
        if (!result.success) {
          return createApiError(
            `Validation failed: ${result.error.errors.map(e => e.message).join(', ')}`,
            400,
            'VALIDATION_ERROR'
          )
        }
        body = result.data
      }
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

    // 5. Fetch existing booking to check ownership and get details
    const { data: existingBooking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        status,
        session:sessions(
          id,
          title,
          trainer_id,
          starts_at
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return createApiError('Booking not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching booking:', fetchError)
      return createApiError('Failed to fetch booking', 500, 'DATABASE_ERROR')
    }

    // 6. Check if already cancelled
    if (existingBooking.status === 'cancelled') {
      return createApiError('Booking is already cancelled', 400, 'ALREADY_CANCELLED')
    }

    // 6b. Prevent cancellation for past sessions (Issue #11)
    const session = Array.isArray(existingBooking.session)
      ? existingBooking.session[0]
      : existingBooking.session

    if (session?.starts_at && new Date(session.starts_at) <= new Date()) {
      return createApiError(
        'Cannot cancel booking for a session that has already started',
        400,
        'SESSION_STARTED'
      )
    }

    // 7. Check user has permission (booking owner, trainer, or admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isBookingOwner = existingBooking.client_id === user.id
    const isSessionTrainer = session?.trainer_id === user.id
    const isAdmin = profile?.is_admin === true

    if (!isBookingOwner && !isSessionTrainer && !isAdmin) {
      return createApiError(
        'You do not have permission to cancel this booking',
        403,
        'FORBIDDEN'
      )
    }

    // 8. Cancel the booking
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: body.cancellation_reason || null,
      })
      .eq('id', id)
      .select(`
        *,
        session:sessions(
          *,
          session_type:session_types(*),
          trainer:profiles!sessions_trainer_id_fkey(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .single()

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return createApiError('Failed to cancel booking', 500, 'DATABASE_ERROR')
    }

    // 9. Log audit event
    await logAuditEventFromRequest({
      userId: user.id,
      action: 'BOOKING_CANCEL',
      resource: 'booking',
      resourceId: id,
      metadata: {
        session_id: session?.id,
        session_title: session?.title,
        cancelled_by: isBookingOwner ? 'client' : isSessionTrainer ? 'trainer' : 'admin',
        reason: body.cancellation_reason,
      },
    })

    // 10. Handle FK join format
    const sessionData = Array.isArray(booking.session)
      ? booking.session[0] || null
      : booking.session

    if (sessionData?.session_type) {
      sessionData.session_type = Array.isArray(sessionData.session_type)
        ? sessionData.session_type[0] || null
        : sessionData.session_type
    }
    if (sessionData?.trainer) {
      sessionData.trainer = Array.isArray(sessionData.trainer)
        ? sessionData.trainer[0] || null
        : sessionData.trainer
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        session: sessionData,
      },
      message: 'Booking cancelled successfully',
    })
  } catch (error) {
    return handleUnexpectedError(error, 'booking-cancel')
  }
}
