/**
 * Push Unsubscription API Route
 *
 * POST /api/push/unsubscribe - Remove a device's push subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

/**
 * POST /api/push/unsubscribe
 *
 * Removes the push subscription record for the given endpoint,
 * scoped to the authenticated user so users cannot remove each other's
 * subscriptions.
 *
 * Body:
 * - endpoint: string (required)
 */
export async function POST(request: NextRequest) {
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

    // 3. Parse and validate body
    let body: { endpoint?: string }
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    const { endpoint } = body

    if (!endpoint || typeof endpoint !== 'string') {
      return createApiError('Missing required field: endpoint', 400, 'VALIDATION_ERROR')
    }

    // 4. Delete only the subscription owned by this user for this endpoint
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, profileId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )

    return NextResponse.json({ success: true, message: 'Push subscription removed' })
  } catch (error) {
    return handleUnexpectedError(error, 'push-unsubscribe')
  }
}
