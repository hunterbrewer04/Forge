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
import { timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { profiles, bookings } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { isValidUUID } from '@/lib/api/validation'
import { generateICalFeed } from '@/modules/calendar-booking/services/calendar'

interface RouteParams {
  params: Promise<{ clientId: string }>
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

    // Validate token and get user profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, cleanClientId),
      columns: { id: true, fullName: true, calendarToken: true },
    })

    if (!profile) {
      return new NextResponse('Not Found - User not found', {
        status: 404,
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

    // Fetch client's confirmed bookings with nested session and session type
    const clientBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.clientId, cleanClientId),
        eq(bookings.status, 'confirmed')
      ),
      with: {
        session: {
          with: {
            sessionType: true,
          },
        },
      },
    })

    // Filter by date range and map to feed shape
    const sessionsForFeed = clientBookings
      .map(booking => {
        const session = booking.session
        if (!session) return null

        return {
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
          bookedCount: 0, // Not relevant for client view
        }
      })
      .filter((session): session is NonNullable<typeof session> => {
        if (!session) return false
        // Filter by date range
        return session.startsAt >= startDate && session.startsAt <= endDate
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())

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
