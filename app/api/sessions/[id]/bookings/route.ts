/**
 * Session Bookings API Route
 *
 * GET /api/sessions/[id]/bookings - Get all bookings for a session (trainer only)
 *
 * Returns list of confirmed bookings with client details.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { env } from '@/lib/env-validation'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sessions/[id]/bookings
 *
 * Fetches all confirmed bookings for a session.
 * Only accessible by the session's trainer.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params

    // 1. Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Create Supabase client
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

    // 3. Verify session exists and user is the trainer
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, trainer_id')
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
      }
      console.error('Error fetching session:', sessionError)
      return createApiError('Failed to fetch session', 500, 'DATABASE_ERROR')
    }

    // 4. Check if user is the trainer (only trainers can see booking list)
    if (user.id !== session.trainer_id) {
      return createApiError(
        'Only the session trainer can view bookings',
        403,
        'FORBIDDEN'
      )
    }

    // 5. Fetch all confirmed bookings with client details
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        client_id,
        status,
        booked_at,
        client:profiles!client_id(
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('session_id', sessionId)
      .eq('status', 'confirmed')
      .order('booked_at', { ascending: true })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return createApiError('Failed to fetch bookings', 500, 'DATABASE_ERROR')
    }

    // 6. Normalize FK joins (Supabase can return arrays or objects)
    const normalizedBookings = bookings.map(booking => ({
      id: booking.id,
      client_id: booking.client_id,
      status: booking.status,
      booked_at: booking.booked_at,
      client: Array.isArray(booking.client)
        ? booking.client[0] || null
        : booking.client,
    }))

    return NextResponse.json({
      success: true,
      bookings: normalizedBookings,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-bookings-get')
  }
}
