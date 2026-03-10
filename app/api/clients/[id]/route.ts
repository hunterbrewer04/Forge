/**
 * Client Detail API Route
 *
 * GET /api/clients/[id] - Get a single client's profile (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { bookings, conversations } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/clients/[id]
 *
 * Returns the full profile for a single client, plus their booking history
 * and summary stats. Verifies the trainer-client relationship via conversations
 * before returning any data.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params

    // 1. Validate trainer role
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Verify the trainer-client relationship and load the full client profile
    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.trainerId, profileId),
        eq(conversations.clientId, clientId)
      ),
      with: {
        client: true, // full profile row
      },
    })

    if (!conv || !conv.client) {
      return createApiError('Client not found', 404, 'RESOURCE_NOT_FOUND')
    }

    const client = conv.client

    // 4. Fetch the client's booking history with session details
    const bookingHistory = await db.query.bookings.findMany({
      where: eq(bookings.clientId, clientId),
      orderBy: [desc(bookings.bookedAt)],
      with: {
        session: {
          with: {
            sessionType: {
              columns: {
                id: true,
                name: true,
                slug: true,
                color: true,
                icon: true,
              },
            },
          },
          columns: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            location: true,
            status: true,
            durationMinutes: true,
          },
        },
      },
    })

    // 5. Compute stats
    const totalBookings = bookingHistory.length
    const attendedBookings = bookingHistory.filter((b) => b.status === 'attended').length
    const cancelledBookings = bookingHistory.filter((b) => b.status === 'cancelled').length
    const noShowBookings = bookingHistory.filter((b) => b.status === 'no_show').length

    // 6. Map booking history to snake_case
    const bookings_mapped = bookingHistory.map((b) => ({
      id: b.id,
      session_id: b.sessionId,
      status: b.status,
      booked_at: b.bookedAt,
      cancelled_at: b.cancelledAt,
      cancellation_reason: b.cancellationReason,
      created_at: b.createdAt,
      session: b.session
        ? {
            id: b.session.id,
            title: b.session.title,
            starts_at: b.session.startsAt,
            ends_at: b.session.endsAt,
            location: b.session.location,
            status: b.session.status,
            duration_minutes: b.session.durationMinutes,
            session_type: b.session.sessionType
              ? {
                  id: b.session.sessionType.id,
                  name: b.session.sessionType.name,
                  slug: b.session.sessionType.slug,
                  color: b.session.sessionType.color,
                  icon: b.session.sessionType.icon,
                }
              : null,
          }
        : null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        id: client.id,
        full_name: client.fullName,
        avatar_url: client.avatarUrl,
        username: client.username,
        email: client.email,
        is_member: client.isMember,
        membership_status: client.membershipStatus,
        has_full_access: client.hasFullAccess,
        created_at: client.createdAt,
        conversation_id: conv.id,
        stats: {
          total_bookings: totalBookings,
          attended: attendedBookings,
          cancelled: cancelledBookings,
          no_show: noShowBookings,
        },
        bookings: bookings_mapped,
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'client-detail')
  }
}
