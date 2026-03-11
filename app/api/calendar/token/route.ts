/**
 * Calendar Token API Routes
 *
 * GET /api/calendar/token - Get or create calendar token for current user
 * POST /api/calendar/token - Regenerate calendar token
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getOrCreateCalendarToken, regenerateCalendarToken } from '@/modules/calendar-booking/services/calendar'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'

/**
 * Derive base URL from the incoming request.
 * Uses X-Forwarded-Host (set by Vercel) or Host header.
 * Falls back to NEXT_PUBLIC_APP_URL env var.
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    return `${protocol}://${host}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'https://forge-pwa.vercel.app'
}

/**
 * GET /api/calendar/token
 *
 * Returns the calendar token and feed URL for the current user.
 * Creates a token if one doesn't exist.
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

    // 3. Get or create token
    const token = await getOrCreateCalendarToken(db, profileId)

    // 4. Get user profile to determine role
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { isTrainer: true },
    })

    const isTrainer = profile?.isTrainer ?? false

    // 5. Build feed URL based on role
    const baseUrl = getBaseUrl(request)
    const feedUrl = isTrainer
      ? `${baseUrl}/api/calendar/${profileId}.ics?token=${token}`
      : `${baseUrl}/api/calendar/client/${profileId}.ics?token=${token}`

    return NextResponse.json({
      success: true,
      token,
      feedUrl,
      userId: profileId,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'calendar-token-get')
  }
}

/**
 * POST /api/calendar/token
 *
 * Regenerates the calendar token. This invalidates the old feed URL.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit (stricter for regeneration)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.BOOKING, // Use booking preset (10/min) for regeneration
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Regenerate token
    const token = await regenerateCalendarToken(db, profileId)

    // 4. Get user profile to determine role
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { isTrainer: true },
    })

    const isTrainer = profile?.isTrainer ?? false

    // 5. Build new feed URL based on role
    const baseUrl = getBaseUrl(request)
    const feedUrl = isTrainer
      ? `${baseUrl}/api/calendar/${profileId}.ics?token=${token}`
      : `${baseUrl}/api/calendar/client/${profileId}.ics?token=${token}`

    return NextResponse.json({
      success: true,
      token,
      feedUrl,
      userId: profileId,
      message: 'Calendar token regenerated. Old feed URLs are now invalid.',
    })
  } catch (error) {
    return handleUnexpectedError(error, 'calendar-token-regenerate')
  }
}
