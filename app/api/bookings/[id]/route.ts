/**
 * Booking Detail API Routes
 *
 * GET /api/bookings/[id] - Get a single booking
 * PATCH /api/bookings/[id] - Cancel a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { bookings, profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { BookingSchemas } from '@/lib/api/validation'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { sendPushToUser } from '@/lib/services/push-send'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bookings/[id]
 *
 * Returns a single booking with session details.
 * Only the booking owner, session trainer, or admin can view.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
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

    // 3. Fetch booking with relations
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        session: {
          with: {
            sessionType: true,
            trainer: {
              columns: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        client: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!booking) {
      return createApiError('Booking not found', 404, 'RESOURCE_NOT_FOUND')
    }

    const session = booking.session
      ? {
          id: booking.session.id,
          trainer_id: booking.session.trainerId,
          session_type_id: booking.session.sessionTypeId,
          title: booking.session.title,
          description: booking.session.description,
          duration_minutes: booking.session.durationMinutes,
          capacity: booking.session.capacity,
          is_premium: booking.session.isPremium,
          location: booking.session.location,
          starts_at: booking.session.startsAt,
          ends_at: booking.session.endsAt,
          status: booking.session.status,
          cancelled_at: booking.session.cancelledAt,
          cancellation_reason: booking.session.cancellationReason,
          created_at: booking.session.createdAt,
          updated_at: booking.session.updatedAt,
          session_type: booking.session.sessionType
            ? {
                id: booking.session.sessionType.id,
                name: booking.session.sessionType.name,
                slug: booking.session.sessionType.slug,
                color: booking.session.sessionType.color,
                icon: booking.session.sessionType.icon,
                is_premium: booking.session.sessionType.isPremium,
                created_at: booking.session.sessionType.createdAt,
                updated_at: booking.session.sessionType.updatedAt,
              }
            : null,
          trainer: booking.session.trainer
            ? {
                id: booking.session.trainer.id,
                full_name: booking.session.trainer.fullName,
                avatar_url: booking.session.trainer.avatarUrl,
              }
            : null,
        }
      : null

    const client = booking.client
      ? {
          id: booking.client.id,
          full_name: booking.client.fullName,
          avatar_url: booking.client.avatarUrl,
        }
      : null

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        session_id: booking.sessionId,
        client_id: booking.clientId,
        status: booking.status,
        booked_at: booking.bookedAt,
        cancelled_at: booking.cancelledAt,
        cancellation_reason: booking.cancellationReason,
        created_at: booking.createdAt,
        updated_at: booking.updatedAt,
        session,
        client,
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'booking-get')
  }
}

/**
 * PATCH /api/bookings/[id]
 *
 * Updates a booking's status.
 *
 * Supported status transitions:
 * - cancelled  — booking owner, session trainer, or admin
 * - attended   — session trainer or admin only
 * - no_show    — session trainer or admin only
 *
 * Body:
 * - status: 'cancelled' | 'attended' | 'no_show'
 * - cancellation_reason?: string  (only meaningful when status = 'cancelled')
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.BOOKING,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse and validate request body
    // Accept both the legacy cancel-only shape and the new status-aware shape.
    type PatchBody = {
      status?: 'cancelled' | 'attended' | 'no_show'
      cancellation_reason?: string | null
    }
    let body: PatchBody = {}
    try {
      const text = await request.text()
      if (text) {
        const parsed = JSON.parse(text)
        // Validate cancellation_reason via existing schema when cancelling
        const cancelResult = BookingSchemas.cancel.safeParse(parsed)
        if (!cancelResult.success) {
          return createApiError(
            `Validation failed: ${cancelResult.error.errors.map((e) => e.message).join(', ')}`,
            400,
            'VALIDATION_ERROR'
          )
        }
        // status is optional in the cancel schema — accept it separately
        const allowedStatuses = ['cancelled', 'attended', 'no_show'] as const
        const incomingStatus = parsed?.status
        if (incomingStatus !== undefined && !allowedStatuses.includes(incomingStatus)) {
          return createApiError(
            `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
            400,
            'VALIDATION_ERROR'
          )
        }
        body = {
          status: incomingStatus as PatchBody['status'],
          cancellation_reason: cancelResult.data.cancellation_reason,
        }
      }
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    // Default to 'cancelled' when no status is supplied (backward-compat)
    const targetStatus = body.status ?? 'cancelled'

    // 4. Fetch existing booking with session details for permission check
    const existingBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        session: {
          columns: {
            id: true,
            title: true,
            trainerId: true,
            startsAt: true,
          },
        },
      },
      columns: {
        id: true,
        clientId: true,
        status: true,
      },
    })

    if (!existingBooking) {
      return createApiError('Booking not found', 404, 'RESOURCE_NOT_FOUND')
    }

    const session = existingBooking.session

    // 5. Guard: already in the target state
    if (existingBooking.status === targetStatus) {
      return createApiError(
        `Booking is already ${targetStatus.replace('_', '-')}`,
        400,
        'INVALID_STATUS_TRANSITION'
      )
    }

    // 5b. For cancellation: prevent acting on past sessions (client path)
    if (targetStatus === 'cancelled') {
      if (session?.startsAt && session.startsAt <= new Date()) {
        return createApiError(
          'Cannot cancel booking for a session that has already started',
          400,
          'SESSION_STARTED'
        )
      }
    }

    // 6. Resolve requester role
    const requester = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { isAdmin: true },
    })

    const isBookingOwner = existingBooking.clientId === profileId
    const isSessionTrainer = session?.trainerId === profileId
    const isAdmin = requester?.isAdmin === true
    const isTrainerOrAdmin = isSessionTrainer || isAdmin

    // 7. Permission checks per target status
    if (targetStatus === 'cancelled') {
      if (!isBookingOwner && !isTrainerOrAdmin) {
        return createApiError(
          'You do not have permission to cancel this booking',
          403,
          'FORBIDDEN'
        )
      }
    } else {
      // attended / no_show — trainer or admin only
      if (!isTrainerOrAdmin) {
        return createApiError(
          'Only the session trainer or an admin can mark attendance',
          403,
          'FORBIDDEN'
        )
      }
    }

    // 8. Build update payload
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: new Date(),
    }
    if (targetStatus === 'cancelled') {
      updatePayload.cancelledAt = new Date()
      updatePayload.cancellationReason = body.cancellation_reason ?? null
    }

    // 9. Apply update
    const [updatedBooking] = await db
      .update(bookings)
      .set(updatePayload)
      .where(eq(bookings.id, id))
      .returning()

    // 10. Fetch updated booking with session relations for response
    const bookingWithSession = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        session: {
          with: {
            sessionType: true,
            trainer: {
              columns: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    })

    // 11. Log audit event
    const auditAction =
      targetStatus === 'cancelled'
        ? 'BOOKING_CANCEL'
        : targetStatus === 'attended'
          ? 'BOOKING_ATTEND'
          : 'BOOKING_NO_SHOW'

    await logAuditEventFromRequest({
      userId: profileId,
      action: auditAction,
      resource: 'booking',
      resourceId: id,
      metadata: {
        session_id: session?.id,
        session_title: session?.title,
        updated_by: isBookingOwner ? 'client' : isSessionTrainer ? 'trainer' : 'admin',
        reason: body.cancellation_reason,
      },
    })

    // 12. Push notification for cancellations only (best-effort)
    if (targetStatus === 'cancelled') {
      const notifyUserId = isBookingOwner ? session?.trainerId : existingBooking.clientId
      if (notifyUserId) {
        const cancelledBy = isBookingOwner ? 'client' : isSessionTrainer ? 'trainer' : 'admin'
        sendPushToUser(notifyUserId, {
          title: 'Booking Cancelled',
          body: `A booking for "${session?.title || 'session'}" was cancelled by the ${cancelledBy}.`,
          url: '/schedule',
          type: 'booking',
        }).catch(() => {})
      }
    }

    // 13. Build response
    const s = bookingWithSession?.session
    const sessionData = s
      ? {
          id: s.id,
          trainer_id: s.trainerId,
          session_type_id: s.sessionTypeId,
          title: s.title,
          description: s.description,
          duration_minutes: s.durationMinutes,
          capacity: s.capacity,
          is_premium: s.isPremium,
          location: s.location,
          starts_at: s.startsAt,
          ends_at: s.endsAt,
          status: s.status,
          cancelled_at: s.cancelledAt,
          cancellation_reason: s.cancellationReason,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
          session_type: s.sessionType
            ? {
                id: s.sessionType.id,
                name: s.sessionType.name,
                slug: s.sessionType.slug,
                color: s.sessionType.color,
                icon: s.sessionType.icon,
                is_premium: s.sessionType.isPremium,
                created_at: s.sessionType.createdAt,
                updated_at: s.sessionType.updatedAt,
              }
            : null,
          trainer: s.trainer
            ? {
                id: s.trainer.id,
                full_name: s.trainer.fullName,
                avatar_url: s.trainer.avatarUrl,
              }
            : null,
        }
      : null

    const statusLabel =
      targetStatus === 'cancelled'
        ? 'cancelled'
        : targetStatus === 'attended'
          ? 'marked as attended'
          : 'marked as no-show'

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBooking.id,
        session_id: updatedBooking.sessionId,
        client_id: updatedBooking.clientId,
        status: updatedBooking.status,
        booked_at: updatedBooking.bookedAt,
        cancelled_at: updatedBooking.cancelledAt,
        cancellation_reason: updatedBooking.cancellationReason,
        created_at: updatedBooking.createdAt,
        updated_at: updatedBooking.updatedAt,
        session: sessionData,
      },
      message: `Booking ${statusLabel} successfully`,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'booking-update')
  }
}
