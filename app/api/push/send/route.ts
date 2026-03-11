/**
 * Push Notification Send API
 *
 * POST /api/push/send
 *
 * Sends push notifications to a specific user's subscribed devices.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { sendPushToUser } from '@/lib/services/push-send'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.MESSAGING,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { recipientId, title, body, url, tag, type } = await request.json()

    if (!recipientId || !title || !body) {
      return createApiError('recipientId, title, and body are required', 400, 'VALIDATION_ERROR')
    }

    await sendPushToUser(recipientId, { title, body, url, tag, type })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'push-send')
  }
}
