/**
 * Session Detail API Routes
 *
 * GET /api/sessions/[id] - Get a single session
 * PATCH /api/sessions/[id] - Update a session (trainer only)
 * DELETE /api/sessions/[id] - Cancel/delete a session (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { sessions, bookings, profiles } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, SessionSchemas } from '@/lib/api/validation'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import { getSessionAvailability } from '@/lib/db/queries/sessions'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** Map a session + relations row to the snake_case shape the frontend expects */
function formatSession(s: {
  id: string
  trainerId: string
  sessionTypeId: string | null
  title: string
  description: string | null
  durationMinutes: number
  capacity: number | null
  isPremium: boolean
  location: string | null
  startsAt: Date
  endsAt: Date
  status: 'scheduled' | 'cancelled' | 'completed'
  cancelledAt: Date | null
  cancellationReason: string | null
  createdAt: Date
  updatedAt: Date
  sessionType?: {
    id: string
    name: string
    slug: string
    color: string
    icon: string
    isPremium: boolean
    createdAt: Date
    updatedAt: Date
  } | null
  trainer?: {
    id: string
    fullName: string | null
    avatarUrl: string | null
  } | null
}) {
  return {
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
}

/**
 * GET /api/sessions/[id]
 *
 * Returns a single session with details
 * Query params:
 * - include_bookings: If true, includes all bookings for the session (trainer only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const includeBookings = searchParams.get('include_bookings') === 'true'

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

    // 3. Fetch session with relations
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
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
    })

    if (!session) {
      return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 4. Get availability and user booking in parallel
    const [availability, userBookingRow] = await Promise.all([
      getSessionAvailability(id),
      db.query.bookings.findFirst({
        where: and(
          eq(bookings.sessionId, id),
          eq(bookings.clientId, profileId),
          eq(bookings.status, 'confirmed')
        ),
      }),
    ])

    const resolvedAvailability = availability ?? {
      capacity: session.capacity ?? 1,
      booked_count: 0,
      spots_left: session.capacity ?? 1,
      is_full: false,
    }

    const userBooking = userBookingRow
      ? {
          id: userBookingRow.id,
          status: userBookingRow.status,
          booked_at: userBookingRow.bookedAt,
        }
      : null

    // 5. Fetch session bookings if requested (trainer only)
    let sessionBookings: unknown[] | null = null
    if (includeBookings && session.trainerId === profileId) {
      const rawBookings = await db.query.bookings.findMany({
        where: eq(bookings.sessionId, id),
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

      sessionBookings = rawBookings.map((b) => ({
        id: b.id,
        session_id: b.sessionId,
        client_id: b.clientId,
        status: b.status,
        booked_at: b.bookedAt,
        cancelled_at: b.cancelledAt,
        cancellation_reason: b.cancellationReason,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
        client: b.client
          ? {
              id: b.client.id,
              full_name: b.client.fullName,
              avatar_url: b.client.avatarUrl,
            }
          : null,
      }))
    }

    return NextResponse.json({
      success: true,
      session: {
        ...formatSession(session),
        availability: resolvedAvailability,
        user_booking: userBooking,
      },
      bookings: sessionBookings,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-get')
  }
}

/**
 * PATCH /api/sessions/[id]
 *
 * Updates a session. Only the trainer who created it (or admin) can update.
 *
 * Body:
 * - title?: string
 * - description?: string
 * - session_type_id?: string
 * - duration_minutes?: number
 * - capacity?: number
 * - is_premium?: boolean
 * - location?: string
 * - starts_at?: string
 * - ends_at?: string
 * - status?: 'scheduled' | 'cancelled' | 'completed'
 * - cancellation_reason?: string
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
      RateLimitPresets.GENERAL,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse and validate request body
    const bodyResult = await validateRequestBody(request, SessionSchemas.update)
    if (bodyResult instanceof NextResponse) {
      return bodyResult
    }
    const body = bodyResult

    // 4. Fetch existing session
    const existingSession = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
      columns: {
        id: true,
        trainerId: true,
        title: true,
        startsAt: true,
        endsAt: true,
      },
    })

    if (!existingSession) {
      return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 5. Check permission (owner or admin)
    const requester = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { isAdmin: true },
    })

    const isOwner = existingSession.trainerId === profileId
    const isAdmin = requester?.isAdmin === true

    if (!isOwner && !isAdmin) {
      return createApiError(
        'You do not have permission to update this session',
        403,
        'FORBIDDEN'
      )
    }

    // 6a. Validate date range when starts_at or ends_at is updated
    if (body.starts_at !== undefined || body.ends_at !== undefined) {
      const newStartsAt = body.starts_at
        ? new Date(body.starts_at)
        : existingSession.startsAt
      const newEndsAt = body.ends_at
        ? new Date(body.ends_at)
        : existingSession.endsAt

      if (Number.isNaN(newStartsAt.getTime()) || Number.isNaN(newEndsAt.getTime())) {
        return createApiError(
          'Invalid date format: dates must be valid ISO strings',
          400,
          'VALIDATION_ERROR'
        )
      }

      if (newEndsAt <= newStartsAt) {
        return createApiError(
          'Invalid time range: ends_at must be after starts_at',
          400,
          'INVALID_TIME_RANGE'
        )
      }
    }

    // 6b. Validate capacity reduction
    if (body.capacity !== undefined && body.capacity !== null) {
      const [{ value: confirmedCount }] = await db
        .select({ value: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.sessionId, id),
            eq(bookings.status, 'confirmed')
          )
        )

      if (body.capacity < confirmedCount) {
        return createApiError(
          `Cannot reduce capacity below ${confirmedCount} confirmed bookings`,
          400,
          'INVALID_CAPACITY'
        )
      }
    }

    // 7. Build update payload (camelCase for Drizzle)
    const updateData: Parameters<typeof db.update>[0] extends never
      ? never
      : Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.session_type_id !== undefined) updateData.sessionTypeId = body.session_type_id
    if (body.duration_minutes !== undefined) updateData.durationMinutes = body.duration_minutes
    if (body.capacity !== undefined) updateData.capacity = body.capacity
    if (body.is_premium !== undefined) updateData.isPremium = body.is_premium
    if (body.location !== undefined) updateData.location = body.location
    if (body.starts_at !== undefined) updateData.startsAt = new Date(body.starts_at)
    if (body.ends_at !== undefined) updateData.endsAt = new Date(body.ends_at)
    if (body.status !== undefined) {
      updateData.status = body.status
      if (body.status === 'cancelled') {
        updateData.cancelledAt = new Date()
      }
    }
    if (body.cancellation_reason !== undefined)
      updateData.cancellationReason = body.cancellation_reason

    // Always bump updatedAt
    updateData.updatedAt = new Date()

    // 8. Perform update
    await db.update(sessions).set(updateData).where(eq(sessions.id, id))

    // 9. Fetch updated session with relations
    const updated = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
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
    })

    if (!updated) {
      return createApiError('Failed to fetch updated session', 500, 'DATABASE_ERROR')
    }

    // 10. Log audit event
    const auditAction = body.status === 'cancelled' ? 'SESSION_CANCEL' : 'SESSION_UPDATE'
    await logAuditEventFromRequest({
      userId: profileId,
      action: auditAction,
      resource: 'session',
      resourceId: id,
      metadata: {
        changes: Object.keys(updateData),
        status: body.status,
      },
    })

    return NextResponse.json({
      success: true,
      data: formatSession(updated),
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-update')
  }
}

/**
 * DELETE /api/sessions/[id]
 *
 * Deletes a session. Only the trainer who created it (or admin) can delete.
 * Consider using PATCH with status='cancelled' instead to preserve history.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 3. Fetch existing session
    const existingSession = await db.query.sessions.findFirst({
      where: eq(sessions.id, id),
      columns: {
        id: true,
        trainerId: true,
        title: true,
      },
    })

    if (!existingSession) {
      return createApiError('Session not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 4. Check permission (owner or admin)
    const requester = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { isAdmin: true },
    })

    const isOwner = existingSession.trainerId === profileId
    const isAdmin = requester?.isAdmin === true

    if (!isOwner && !isAdmin) {
      return createApiError(
        'You do not have permission to delete this session',
        403,
        'FORBIDDEN'
      )
    }

    // 5. Delete session
    await db.delete(sessions).where(eq(sessions.id, id))

    // 6. Log audit event
    await logAuditEventFromRequest({
      userId: profileId,
      action: 'SESSION_DELETE',
      resource: 'session',
      resourceId: id,
      metadata: {
        title: existingSession.title,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    })
  } catch (error) {
    return handleUnexpectedError(error, 'session-delete')
  }
}
