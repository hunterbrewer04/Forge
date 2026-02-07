/**
 * iCal Feed API Route
 *
 * GET /api/calendar/[trainerId].ics?token=xxx
 *
 * Returns an iCal feed for a trainer's sessions.
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
  params: Promise<{ trainerId: string }>
}

interface SessionForCalendar extends Session {
  session_type?: SessionType | null
  booked_count?: number
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trainerId } = await params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Clean the trainerId (remove .ics extension if present)
    const cleanTrainerId = trainerId.replace(/\.ics$/, '')

    // Validate trainerId is a UUID to prevent header injection
    if (!isValidUUID(cleanTrainerId)) {
      return new NextResponse('Bad Request - Invalid trainer ID', {
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

    // Validate token and get trainer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, calendar_token, is_trainer')
      .eq('id', cleanTrainerId)
      .single()

    if (profileError || !profile) {
      return new NextResponse('Not Found - Trainer not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Verify trainer role and token
    if (!profile.is_trainer) {
      return new NextResponse('Forbidden - Not a trainer', {
        status: 403,
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

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        *,
        session_type:session_types(*)
      `)
      .eq('trainer_id', cleanTrainerId)
      .in('status', ['scheduled', 'completed'])
      .gte('starts_at', startDate.toISOString())
      .lte('starts_at', endDate.toISOString())
      .order('starts_at', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions for calendar:', sessionsError)
      return new NextResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Get booking counts in a single batch query instead of N+1
    const sessionIds = (sessions || []).map((s) => s.id)
    const bookingCountMap = new Map<string, number>()

    if (sessionIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('status', 'confirmed')

      for (const b of bookings || []) {
        bookingCountMap.set(b.session_id, (bookingCountMap.get(b.session_id) || 0) + 1)
      }
    }

    const sessionsWithBookings: SessionForCalendar[] = (sessions || []).map((session) => {
      const session_type = Array.isArray(session.session_type)
        ? session.session_type[0] || null
        : session.session_type

      return {
        ...session,
        session_type,
        booked_count: bookingCountMap.get(session.id) || 0,
      }
    })

    // Generate iCal feed
    const trainerName = profile.full_name || 'Trainer'
    const ical = generateICalFeed(sessionsWithBookings, trainerName)

    // Return iCal file with appropriate headers
    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanTrainerId}.ics"`,
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
