/**
 * Session Booking API Route
 *
 * POST /api/sessions/[id]/book - Book a session
 *
 * Uses a Drizzle transaction to prevent race conditions and enforce capacity
 * limits atomically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { sessions, bookings, profiles, membershipTiers } from '@/lib/db/schema'
import { eq, and, gte, lt, count } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { bookSession } from '@/modules/calendar-booking/services/bookings'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/sessions/[id]/book
 *
 * Books the authenticated user into the session.
 * Uses an atomic Drizzle transaction for capacity enforcement.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: sessionId } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit (stricter for booking to prevent abuse)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.BOOKING,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Fetch member profile for access and quota checks
    const memberProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: {
        isMember: true,
        membershipTierId: true,
        membershipStatus: true,
        hasFullAccess: true,
        isTrainer: true,
        isAdmin: true,
      },
    })

    // Access check — reject users without any valid access tier
    const hasAccess =
      memberProfile?.isTrainer ||
      memberProfile?.isAdmin ||
      memberProfile?.hasFullAccess ||
      (memberProfile?.isMember && memberProfile?.membershipStatus === 'active')

    if (!hasAccess) {
      return createApiError(
        'Active membership or full access required to book sessions',
        403,
        'ACCESS_REQUIRED'
      )
    }

    // 4. Monthly quota check for member accounts
    if (memberProfile?.isMember && memberProfile.membershipTierId) {
      if (memberProfile.membershipStatus !== 'active') {
        return createApiError('Membership is not active', 403, 'MEMBERSHIP_INACTIVE')
      }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      const [[{ value: bookingCount }], tier] = await Promise.all([
        db
          .select({ value: count() })
          .from(bookings)
          .where(
            and(
              eq(bookings.clientId, profileId),
              gte(bookings.createdAt, startOfMonth),
              lt(bookings.createdAt, startOfNextMonth)
            )
          ),
        db.query.membershipTiers.findFirst({
          where: eq(membershipTiers.id, memberProfile.membershipTierId),
          columns: { monthlyBookingQuota: true },
        }),
      ])

      if (tier && bookingCount >= tier.monthlyBookingQuota) {
        return createApiError(
          `Monthly booking quota of ${tier.monthlyBookingQuota} sessions reached`,
          429,
          'QUOTA_EXCEEDED'
        )
      }
    }

    // 5. Fetch session info for pre-flight checks and audit logging
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      columns: {
        id: true,
        title: true,
        startsAt: true,
        trainerId: true,
      },
    })

    if (!session) {
      return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 5a. Prevent booking past sessions
    if (session.startsAt <= new Date()) {
      return createApiError(
        'Cannot book a session that has already started',
        400,
        'SESSION_STARTED'
      )
    }

    // 5b. Prevent trainer from booking their own sessions
    if (profileId === session.trainerId) {
      return createApiError(
        'Trainers cannot book their own sessions',
        403,
        'TRAINER_SELF_BOOKING'
      )
    }

    // 6. Atomic booking via transaction
    let newBooking: Awaited<ReturnType<typeof bookSession>>
    try {
      newBooking = await bookSession(db, sessionId, profileId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to book session'

      if (message === 'Session not available') {
        return createApiError(message, 400, 'SESSION_NOT_AVAILABLE')
      }
      if (message === 'Session is full') {
        return createApiError(message, 409, 'SESSION_FULL')
      }
      if (message === 'Already booked') {
        return createApiError('Session already booked', 409, 'ALREADY_BOOKED')
      }

      console.error('Error booking session:', err)
      return createApiError('Failed to book session', 500, 'DATABASE_ERROR')
    }

    // 7. Fetch the booking with session relations for the response
    const bookingWithSession = await db.query.bookings.findFirst({
      where: eq(bookings.id, newBooking.id),
      with: {
        session: {
          with: {
            sessionType: true,
          },
          columns: {
            id: true,
            title: true,
            startsAt: true,
            endsAt: true,
            location: true,
            sessionTypeId: true,
          },
        },
      },
    })

    // 8. Log audit event
    await logAuditEventFromRequest({
      userId: profileId,
      action: 'BOOKING_CREATE',
      resource: 'booking',
      resourceId: newBooking.id,
      metadata: {
        session_id: sessionId,
        session_title: session.title,
        session_starts_at: session.startsAt,
        trainer_id: session.trainerId,
      },
    })

    if (!bookingWithSession) {
      // Booking was created, but we couldn't fetch it — return minimal success
      return NextResponse.json(
        {
          success: true,
          data: {
            id: newBooking.id,
            session_id: sessionId,
            client_id: profileId,
            status: 'confirmed',
          },
          message: 'Session booked successfully',
        },
        { status: 201 }
      )
    }

    const bws = bookingWithSession
    const sessionData = bws.session
      ? {
          id: bws.session.id,
          title: bws.session.title,
          starts_at: bws.session.startsAt,
          ends_at: bws.session.endsAt,
          location: bws.session.location,
          session_type: bws.session.sessionType
            ? {
                id: bws.session.sessionType.id,
                name: bws.session.sessionType.name,
                slug: bws.session.sessionType.slug,
                color: bws.session.sessionType.color,
                icon: bws.session.sessionType.icon,
                is_premium: bws.session.sessionType.isPremium,
                created_at: bws.session.sessionType.createdAt,
                updated_at: bws.session.sessionType.updatedAt,
              }
            : null,
        }
      : null

    return NextResponse.json(
      {
        success: true,
        data: {
          id: bws.id,
          session_id: bws.sessionId,
          client_id: bws.clientId,
          status: bws.status,
          booked_at: bws.bookedAt,
          cancelled_at: bws.cancelledAt,
          cancellation_reason: bws.cancellationReason,
          created_at: bws.createdAt,
          updated_at: bws.updatedAt,
          session: sessionData,
        },
        message: 'Session booked successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'session-book')
  }
}
