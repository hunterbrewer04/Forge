/**
 * Session Bookings API Route
 *
 * GET /api/sessions/[id]/bookings - Get all bookings for a session (trainer only)
 *
 * Returns list of confirmed bookings with client details.
 */

import { NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { sessions, bookings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/sessions/[id]/bookings
 *
 * Fetches all confirmed bookings for a session.
 * Only accessible by the session's trainer.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Verify session exists and user is the trainer
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      columns: {
        id: true,
        trainerId: true,
      },
    })

    if (!session) {
      return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 3. Only the session trainer can view the booking list
    if (profileId !== session.trainerId) {
      return createApiError(
        'Only the session trainer can view bookings',
        403,
        'FORBIDDEN'
      )
    }

    // 4. Fetch confirmed bookings with client details
    const rawBookings = await db.query.bookings.findMany({
      where: eq(bookings.sessionId, sessionId),
      orderBy: (b, { asc }) => [asc(b.bookedAt)],
      with: {
        client: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    const normalizedBookings = rawBookings.map((b) => ({
      id: b.id,
      client_id: b.clientId,
      status: b.status,
      booked_at: b.bookedAt,
      client: b.client
        ? {
            id: b.client.id,
            full_name: b.client.fullName,
            avatar_url: b.client.avatarUrl,
          }
        : null,
    }))

    return NextResponse.json({
      success: true,
      bookings: normalizedBookings,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-bookings-get')
  }
}
