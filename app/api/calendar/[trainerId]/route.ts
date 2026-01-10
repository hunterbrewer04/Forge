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
import { env } from '@/lib/env-validation'
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

    if (profile.calendar_token !== token) {
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

    // Get booking counts for each session
    const sessionsWithBookings: SessionForCalendar[] = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('status', 'confirmed')

        // Handle FK join format
        const session_type = Array.isArray(session.session_type)
          ? session.session_type[0] || null
          : session.session_type

        return {
          ...session,
          session_type,
          booked_count: count || 0,
        }
      })
    )

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
