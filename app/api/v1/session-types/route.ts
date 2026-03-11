/**
 * Public Session Types API (v1)
 *
 * GET /api/v1/session-types - List all active session types (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { sessionTypes } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

/**
 * GET /api/v1/session-types
 *
 * Returns all session types with public fields only.
 * No authentication required — rate limited by IP address.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limit check (IP-based, no userId)
    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 2. Query session types via Drizzle
    let results
    try {
      results = await db.query.sessionTypes.findMany({
        columns: {
          id: true,
          name: true,
          slug: true,
          color: true,
          icon: true,
          isPremium: true,
        },
        orderBy: asc(sessionTypes.name),
      })
    } catch (dbErr) {
      console.error('Error fetching session types:', dbErr)
      return createApiError('Failed to fetch session types', 500, 'DATABASE_ERROR')
    }

    // 3. Return public session types
    return NextResponse.json({
      success: true,
      sessionTypes: results,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'v1-session-types-list')
  }
}
