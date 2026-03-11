/**
 * Push Subscription API Route
 *
 * POST /api/push/subscribe - Register a device for push notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

/**
 * POST /api/push/subscribe
 *
 * Saves a Web Push subscription for the authenticated user.
 * Uses an upsert on (user_id, endpoint) so re-subscribing a device
 * simply refreshes the keys rather than creating a duplicate row.
 *
 * Body:
 * - endpoint: string (required)
 * - auth_key: string (required)
 * - p256dh_key: string (required)
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
    let body: { endpoint?: string; auth_key?: string; p256dh_key?: string }
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    const { endpoint, auth_key, p256dh_key } = body

    if (!endpoint || typeof endpoint !== 'string') {
      return createApiError('Missing required field: endpoint', 400, 'VALIDATION_ERROR')
    }
    if (!auth_key || typeof auth_key !== 'string') {
      return createApiError('Missing required field: auth_key', 400, 'VALIDATION_ERROR')
    }
    if (!p256dh_key || typeof p256dh_key !== 'string') {
      return createApiError('Missing required field: p256dh_key', 400, 'VALIDATION_ERROR')
    }

    // 4. Upsert the subscription — conflict on (user_id, endpoint) refreshes keys
    await db
      .insert(pushSubscriptions)
      .values({
        userId: profileId,
        endpoint,
        authKey: auth_key,
        p256dhKey: p256dh_key,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          authKey: auth_key,
          p256dhKey: p256dh_key,
        },
      })

    return NextResponse.json(
      { success: true, message: 'Push subscription saved' },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'push-subscribe')
  }
}
