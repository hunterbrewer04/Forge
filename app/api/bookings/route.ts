/**
 * Bookings API Routes
 *
 * GET /api/bookings - List user's bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { bookings } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { BookingSchemas } from '@/lib/api/validation'
import type { BookingFilters } from '@/lib/types/sessions'

/**
 * GET /api/bookings
 *
 * Returns the authenticated user's bookings.
 *
 * Query params:
 * - status: Filter by status (confirmed, cancelled, attended, no_show)
 * - upcoming: Only show future sessions (default: true)
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

    // 3. Parse and validate query params
    const { searchParams } = new URL(request.url)

    // count_only=true: return just the confirmed booking count for this user
    if (searchParams.get('count_only') === 'true') {
      const [{ value: bookingCount }] = await db
        .select({ value: count() })
        .from(bookings)
        .where(and(eq(bookings.clientId, profileId), eq(bookings.status, 'confirmed')))

      return NextResponse.json({
        success: true,
        count: bookingCount,
      })
    }

    const statusParam = searchParams.get('status')
    let validatedStatus: BookingFilters['status'] | undefined

    if (statusParam) {
      const statusResult = BookingSchemas.statusFilter.safeParse(statusParam)
      if (!statusResult.success) {
        return createApiError(
          'Invalid status filter. Allowed: confirmed, cancelled, attended, no_show',
          400,
          'VALIDATION_ERROR'
        )
      }
      validatedStatus = statusResult.data
    }

    const filters: BookingFilters = {
      status: validatedStatus,
      upcoming: searchParams.get('upcoming') !== 'false',
    }

    // 4. Build where conditions
    const conditions = [eq(bookings.clientId, profileId)]
    if (filters.status) {
      conditions.push(eq(bookings.status, filters.status))
    }

    // 5. Execute query with nested relations
    const rawBookings = await db.query.bookings.findMany({
      where: and(...conditions),
      orderBy: [desc(bookings.bookedAt)],
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

    // 6. Map to snake_case response shape
    const processedBookings = rawBookings.map((b) => {
      const session = b.session
        ? {
            id: b.session.id,
            trainer_id: b.session.trainerId,
            session_type_id: b.session.sessionTypeId,
            title: b.session.title,
            description: b.session.description,
            duration_minutes: b.session.durationMinutes,
            capacity: b.session.capacity,
            is_premium: b.session.isPremium,
            location: b.session.location,
            starts_at: b.session.startsAt,
            ends_at: b.session.endsAt,
            status: b.session.status,
            cancelled_at: b.session.cancelledAt,
            cancellation_reason: b.session.cancellationReason,
            created_at: b.session.createdAt,
            updated_at: b.session.updatedAt,
            session_type: b.session.sessionType
              ? {
                  id: b.session.sessionType.id,
                  name: b.session.sessionType.name,
                  slug: b.session.sessionType.slug,
                  color: b.session.sessionType.color,
                  icon: b.session.sessionType.icon,
                  is_premium: b.session.sessionType.isPremium,
                  created_at: b.session.sessionType.createdAt,
                  updated_at: b.session.sessionType.updatedAt,
                }
              : null,
            trainer: b.session.trainer
              ? {
                  id: b.session.trainer.id,
                  full_name: b.session.trainer.fullName,
                  avatar_url: b.session.trainer.avatarUrl,
                }
              : null,
          }
        : null

      return {
        id: b.id,
        session_id: b.sessionId,
        client_id: b.clientId,
        status: b.status,
        booked_at: b.bookedAt,
        cancelled_at: b.cancelledAt,
        cancellation_reason: b.cancellationReason,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
        session,
      }
    })

    // 7. Filter for upcoming sessions if requested
    let filteredBookings = processedBookings
    if (filters.upcoming !== false) {
      const now = new Date()
      filteredBookings = processedBookings.filter(
        (b) => b.session && new Date(b.session.starts_at) >= now
      )
    }

    return NextResponse.json({
      success: true,
      data: filteredBookings,
      count: filteredBookings.length,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'bookings-list')
  }
}
