/**
 * Public Sessions API Routes (v1)
 *
 * GET /api/v1/sessions - List upcoming available sessions (no auth required)
 *
 * Public endpoint for landing pages and walk-in customers who don't have accounts.
 * Returns only future scheduled sessions with availability data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateQueryParams } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { sessions, bookings } from '@/lib/db/schema'
import { eq, and, gt, gte, lte, inArray, count } from 'drizzle-orm'

/**
 * Query parameter schema for public session listing.
 * All params are optional; `date` must match YYYY-MM-DD if provided.
 */
const PublicSessionQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be in YYYY-MM-DD format')
    .max(10)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be in YYYY-MM-DD format')
    .max(10)
    .optional(),
  type: z
    .string()
    .regex(/^[a-z0-9_-]+$/, 'type must be a valid slug')
    .max(50)
    .optional(),
})

/**
 * GET /api/v1/sessions
 *
 * Query params:
 * - date: Filter by date (YYYY-MM-DD)
 * - from: Start of date range (ISO string)
 * - to: End of date range (ISO string)
 * - type: Filter by session_type slug
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check rate limit (IP-based only — no userId)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Validate query params
    const paramsResult = await validateQueryParams(request, PublicSessionQuerySchema)
    if (paramsResult instanceof NextResponse) {
      return paramsResult
    }
    const params = paramsResult

    // 3. Build date filter conditions
    const now = new Date()
    const conditions = [
      eq(sessions.status, 'scheduled'),
      gt(sessions.startsAt, now),
    ]

    if (params.date) {
      const startOfDay = new Date(`${params.date}T00:00:00.000Z`)
      const endOfDay = new Date(`${params.date}T23:59:59.999Z`)
      conditions.push(gte(sessions.startsAt, startOfDay))
      conditions.push(lte(sessions.startsAt, endOfDay))
    } else {
      if (params.from) {
        conditions.push(gte(sessions.startsAt, new Date(params.from)))
      }
      if (params.to) {
        conditions.push(lte(sessions.startsAt, new Date(`${params.to}T23:59:59`)))
      }
    }

    // 4. Fetch sessions with related session type and trainer
    const rows = await db.query.sessions.findMany({
      where: and(...conditions),
      orderBy: (s, { asc }) => [asc(s.startsAt)],
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

    // 5. Filter by session type slug if specified (Drizzle join is always an object, no array coercion needed)
    let filteredSessions = rows
    if (params.type) {
      filteredSessions = filteredSessions.filter(
        (s) => s.sessionType?.slug === params.type
      )
    }

    if (filteredSessions.length === 0) {
      return NextResponse.json({ success: true, sessions: [], count: 0 })
    }

    // 6. Fetch confirmed booking counts in batch — replaces get_sessions_availability_batch RPC
    const sessionIds = filteredSessions.map((s) => s.id)

    const bookingCounts = await db
      .select({
        sessionId: bookings.sessionId,
        bookedCount: count(bookings.id),
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.sessionId, sessionIds),
          eq(bookings.status, 'confirmed')
        )
      )
      .groupBy(bookings.sessionId)

    // Create lookup map for O(1) access
    const bookedCountMap = new Map(
      bookingCounts.map((b) => [b.sessionId, Number(b.bookedCount)])
    )

    // 7. Map sessions with availability data
    const sessionsWithDetails = filteredSessions.map((session) => {
      const bookedCount = bookedCountMap.get(session.id) ?? 0
      const capacity = session.capacity ?? 1
      const spotsLeft = Math.max(0, capacity - bookedCount)

      return {
        ...session,
        availability: {
          capacity,
          booked_count: bookedCount,
          spots_left: spotsLeft,
          is_full: spotsLeft === 0,
        },
      }
    })

    return NextResponse.json({
      success: true,
      sessions: sessionsWithDetails,
      count: sessionsWithDetails.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'v1-sessions-list')
  }
}
