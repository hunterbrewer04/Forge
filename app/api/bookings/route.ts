/**
 * Bookings API Routes
 *
 * GET /api/bookings - List user's bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { env } from '@/lib/env-validation'
import type { BookingFilters } from '@/lib/types/sessions'

/**
 * GET /api/bookings
 *
 * Returns the authenticated user's bookings.
 *
 * Query params:
 * - status: Filter by status (confirmed, cancelled, attended, no_show)
 * - upcoming: Only show future sessions (default: true)
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
    const filters: BookingFilters = {
      status: searchParams.get('status') as BookingFilters['status'] || undefined,
      upcoming: searchParams.get('upcoming') !== 'false',
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
        )
      `)
      .eq('client_id', user.id)
      .order('booked_at', { ascending: false })

    // Filter by status
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // 6. Execute query
    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return createApiError('Failed to fetch bookings', 500, 'DATABASE_ERROR')
    }

    // 7. Process bookings
    const processedBookings = (bookings || []).map((booking) => {
      // Handle FK join format
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

      return {
        ...booking,
        session,
      }
    })

    // 8. Filter for upcoming sessions only if requested
    let filteredBookings = processedBookings
    if (filters.upcoming !== false) {
      const now = new Date().toISOString()
      filteredBookings = processedBookings.filter(
        (b) => b.session && b.session.starts_at >= now
      )
    }

    return NextResponse.json({
      success: true,
      data: filteredBookings,
      count: filteredBookings.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'bookings-list')
  }
}
