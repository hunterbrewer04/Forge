/**
 * iCal Feed API Route (Client)
 *
 * GET /api/calendar/client/[clientId].ics?token=xxx
 *
 * Returns an iCal feed for a client's confirmed bookings.
 * Authentication is via a secure token in the query string,
 * since calendar apps can't use cookies or OAuth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { env } from '@/lib/env-validation'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { isValidUUID } from '@/lib/api/validation'
import { generateICalFeed } from '@/lib/services/calendar'
import type { Session, SessionType } from '@/lib/types/sessions'

interface RouteParams {
  params: Promise<{ clientId: string }>
}

interface SessionForCalendar extends Session {
  session_type?: SessionType | null
  booked_count?: number
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { clientId } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Clean the clientId (remove .ics extension if present)
    const cleanClientId = clientId.replace(/\.ics$/, '')

    // Validate clientId is a UUID to prevent header injection
    if (!isValidUUID(cleanClientId)) {
      return new NextResponse('Bad Request - Invalid client ID', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Rate limit by IP (no auth session available)
    const rateLimitResult = await checkRateLimit(
      request,
      { maxRequests: 30, windowSeconds: 60, keyPrefix: 'calendar' }
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // Validate token is provided
    if (!token) {
      return new NextResponse('Unauthorized - Token required', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Use admin client to bypass RLS for token validation
    const supabase = createClient(
      env.supabaseUrl(),
      env.supabaseServiceRoleKey(),
      { auth: { persistSession: false } }
    )

    // Validate token and get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, calendar_token')
      .eq('id', cleanClientId)
      .single()

    if (profileError || !profile) {
      return new NextResponse('Not Found - User not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Use constant-time comparison to prevent timing attacks
    const storedToken = profile.calendar_token || ''
    let tokensMatch = false
    try {
      const a = Buffer.from(token, 'utf8')
      const b = Buffer.from(storedToken, 'utf8')
      tokensMatch = a.length === b.length && timingSafeEqual(a, b)
    } catch {
      tokensMatch = false
    }

    if (!tokensMatch) {
      return new NextResponse('Unauthorized - Invalid token', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Calculate date range (90 days ahead, 30 days behind)
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 90)

    // Fetch client's confirmed bookings with session data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        session_id,
        session:sessions!inner(
          *,
          session_type:session_types(*)
        )
      `)
      .eq('client_id', cleanClientId)
      .eq('status', 'confirmed')

    if (bookingsError) {
      console.error('Error fetching bookings for calendar:', bookingsError)
      return new NextResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Filter sessions by date range and map to SessionForCalendar format
    const sessionsWithBookings: SessionForCalendar[] = (bookings || [])
      .map((booking) => {
        // Handle FK join array format
        const sessionData = Array.isArray(booking.session)
          ? booking.session[0]
          : booking.session

        if (!sessionData) return null

        const session_type = Array.isArray(sessionData.session_type)
          ? sessionData.session_type[0] || null
          : sessionData.session_type

        return {
          ...sessionData,
          session_type,
          booked_count: 0, // Not relevant for client view
        } as SessionForCalendar
      })
      .filter((session): session is SessionForCalendar => {
        if (!session) return false

        // Filter by date range
        const sessionDate = new Date(session.starts_at)
        return sessionDate >= startDate && sessionDate <= endDate
      })
      .sort((a, b) => {
        // Sort by start time
        return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      })

    // Generate iCal feed
    const ical = generateICalFeed(sessionsWithBookings)

    // Return iCal file with appropriate headers
    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        // Cache for 15 minutes, stale while revalidate for 1 hour
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Calendar feed error:', error)
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}
