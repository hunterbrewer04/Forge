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
import { timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { profiles, sessions, bookings } from '@/lib/db/schema'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { isValidUUID } from '@/lib/api/validation'
import { generateICalFeed } from '@/modules/calendar-booking/services/calendar'

interface RouteParams {
  params: Promise<{ trainerId: string }>
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

    // Validate token and get trainer profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, cleanTrainerId),
      columns: { id: true, fullName: true, calendarToken: true, isTrainer: true },
    })

    if (!profile) {
      return new NextResponse('Not Found - Trainer not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Verify trainer role
    if (!profile.isTrainer) {
      return new NextResponse('Forbidden - Not a trainer', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // Use constant-time comparison to prevent timing attacks
    const storedToken = profile.calendarToken || ''
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

    // Fetch sessions with session type relation
    const rawSessions = await db.query.sessions.findMany({
      where: and(
        eq(sessions.trainerId, cleanTrainerId),
        inArray(sessions.status, ['scheduled', 'completed']),
        gte(sessions.startsAt, startDate),
        lte(sessions.startsAt, endDate)
      ),
      with: {
        sessionType: true,
      },
      orderBy: (s, { asc }) => [asc(s.startsAt)],
    })

    // Get booking counts in a single batch query
    const sessionIds = rawSessions.map(s => s.id)
    const bookingCountMap = new Map<string, number>()

    if (sessionIds.length > 0) {
      const confirmedBookings = await db
        .select({ sessionId: bookings.sessionId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.sessionId, sessionIds),
            eq(bookings.status, 'confirmed')
          )
        )

      for (const b of confirmedBookings) {
        bookingCountMap.set(b.sessionId, (bookingCountMap.get(b.sessionId) || 0) + 1)
      }
    }

    const sessionsForFeed = rawSessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      location: session.location,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: session.status,
      isPremium: session.isPremium,
      capacity: session.capacity,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      sessionType: session.sessionType ?? null,
      bookedCount: bookingCountMap.get(session.id) || 0,
    }))

    // Generate iCal feed
    const ical = generateICalFeed(sessionsForFeed)

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
