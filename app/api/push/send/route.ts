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
import { sendPushToUser } from '@/lib/services/push-send'

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.MESSAGING,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { recipientId, title, body, url, tag, type } = await request.json()

    if (!recipientId || !title || !body) {
      return NextResponse.json(
        { error: 'recipientId, title, and body are required' },
        { status: 400 }
      )
    }

    await sendPushToUser(recipientId, { title, body, url, tag, type })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
