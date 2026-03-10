/**
 * Sessions API Routes
 *
 * GET /api/sessions - List sessions with optional filters
 * POST /api/sessions - Create a new session (trainer only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth, validateRole } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { sessions, bookings } from '@/lib/db/schema'
import { eq, and, gte, lte, asc, inArray } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, SessionSchemas } from '@/lib/api/validation'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import {
  getSessionsAvailabilityBatch,
} from '@/lib/db/queries/sessions'
import type { SessionFilters } from '@/lib/types/sessions'

/**
 * GET /api/sessions
 *
 * Query params:
 * - date: Filter by date (YYYY-MM-DD)
 * - from: Start of date range (ISO string)
 * - to: End of date range (ISO string)
 * - type: Filter by session_type slug
 * - trainer_id: Filter by trainer (use "me" for current user)
 * - include_full: Include fully booked sessions (default: true)
 * - status: Filter by status (default: scheduled)
 * - types_only: If true, returns session types instead of sessions
 */
export async function GET(request: NextRequest) {
  try {
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

    // 3. Parse query params
    const { searchParams } = new URL(request.url)

    // Handle types_only request
    if (searchParams.get('types_only') === 'true') {
      const types = await db.query.sessionTypes.findMany({
        orderBy: (st, { asc }) => [asc(st.name)],
      })

      return NextResponse.json({
        success: true,
        session_types: types.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          color: t.color,
          icon: t.icon,
          is_premium: t.isPremium,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
        })),
      })
    }

    // Handle trainer_id=me
    let trainerId = searchParams.get('trainer_id') || undefined
    if (trainerId === 'me') {
      trainerId = profileId
    }

    const filters: SessionFilters = {
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      type: searchParams.get('type') || undefined,
      trainer_id: trainerId,
      include_full: searchParams.get('include_full') !== 'false',
      status: (searchParams.get('status') as SessionFilters['status']) || 'scheduled',
    }

    // 4. Build where conditions
    const conditions = [eq(sessions.status, filters.status ?? 'scheduled')]

    if (filters.date) {
      const startOfDay = new Date(`${filters.date}T00:00:00.000Z`)
      const endOfDay = new Date(`${filters.date}T23:59:59.999Z`)
      conditions.push(gte(sessions.startsAt, startOfDay))
      conditions.push(lte(sessions.startsAt, endOfDay))
    } else {
      if (filters.from) {
        conditions.push(gte(sessions.startsAt, new Date(filters.from)))
      }
      if (filters.to) {
        conditions.push(lte(sessions.startsAt, new Date(`${filters.to}T23:59:59`)))
      }
    }

    if (filters.trainer_id) {
      conditions.push(eq(sessions.trainerId, filters.trainer_id))
    }

    // 5. Execute query with relations
    const rawSessions = await db.query.sessions.findMany({
      where: and(...conditions),
      orderBy: [asc(sessions.startsAt)],
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

    // 6. Filter by session type slug if specified
    let filteredSessions = rawSessions
    if (filters.type) {
      filteredSessions = filteredSessions.filter(
        (s) => s.sessionType?.slug === filters.type
      )
    }

    // 7. Batch fetch availability and user bookings (single query each)
    const sessionIds = filteredSessions.map((s) => s.id)

    const [availabilityMap, userBookings] = await Promise.all([
      getSessionsAvailabilityBatch(sessionIds),
      sessionIds.length > 0
        ? db
            .select({
              sessionId: bookings.sessionId,
              id: bookings.id,
              status: bookings.status,
            })
            .from(bookings)
            .where(
              and(
                inArray(bookings.sessionId, sessionIds),
                eq(bookings.clientId, profileId),
                eq(bookings.status, 'confirmed')
              )
            )
        : Promise.resolve([]),
    ])

    const userBookingMap = new Map(
      userBookings.map((b) => [b.sessionId, { id: b.id, status: b.status }])
    )

    // 8. Map sessions to snake_case response shape
    const sessionsWithDetails = filteredSessions.map((s) => {
      const availability = availabilityMap.get(s.id) ?? {
        capacity: s.capacity ?? 1,
        booked_count: 0,
        spots_left: s.capacity ?? 1,
        is_full: false,
      }

      const userBooking = userBookingMap.get(s.id) ?? null

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
        availability,
        user_booking: userBooking,
      }
    })

    // 9. Filter out full sessions if requested
    const finalSessions =
      filters.include_full === false
        ? sessionsWithDetails.filter((s) => !s.availability.is_full)
        : sessionsWithDetails

    return NextResponse.json({
      success: true,
      sessions: finalSessions,
      count: finalSessions.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'sessions-list')
  }
}

/**
 * POST /api/sessions
 *
 * Creates a new session. Trainer or admin only.
 *
 * Body:
 * - title: string (required)
 * - starts_at: string (required, ISO date)
 * - ends_at: string (required, ISO date)
 * - session_type_id?: string
 * - description?: string
 * - duration_minutes?: number (default: 60)
 * - capacity?: number (default: 1)
 * - is_premium?: boolean (default: false)
 * - location?: string
 */
export async function POST(request: NextRequest) {
  try {
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

    // 3. Parse and validate request body
    const bodyResult = await validateRequestBody(request, SessionSchemas.create)
    if (bodyResult instanceof NextResponse) {
      return bodyResult
    }
    const body = bodyResult

    // 4. Validate date formats and range
    const startsAt = new Date(body.starts_at)
    const endsAt = new Date(body.ends_at)

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      return createApiError(
        'Invalid date format: starts_at and ends_at must be valid ISO date strings',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (endsAt <= startsAt) {
      return createApiError(
        'Invalid time range: ends_at must be after starts_at',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (startsAt <= new Date()) {
      return createApiError(
        'Cannot create sessions in the past',
        400,
        'VALIDATION_ERROR'
      )
    }

    // 5. Insert session
    const [inserted] = await db
      .insert(sessions)
      .values({
        trainerId: profileId,
        sessionTypeId: body.session_type_id ?? null,
        title: body.title,
        description: body.description ?? null,
        durationMinutes: body.duration_minutes ?? 60,
        capacity: body.capacity ?? 1,
        isPremium: body.is_premium ?? false,
        location: body.location ?? null,
        startsAt,
        endsAt,
        status: 'scheduled',
      })
      .returning()

    // 6. Fetch the created session with relations for response
    const sessionWithRelations = await db.query.sessions.findFirst({
      where: eq(sessions.id, inserted.id),
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

    if (!sessionWithRelations) {
      return createApiError('Failed to fetch created session', 500, 'DATABASE_ERROR')
    }

    // 7. Log audit event
    await logAuditEventFromRequest({
      userId: profileId,
      action: 'SESSION_CREATE',
      resource: 'session',
      resourceId: inserted.id,
      metadata: {
        title: inserted.title,
        starts_at: inserted.startsAt,
        capacity: inserted.capacity,
      },
    })

    const s = sessionWithRelations
    return NextResponse.json(
      {
        success: true,
        data: {
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
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'sessions-create')
  }
}
