import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import Ably, { type capabilityOp } from 'ably'

let ablyRest: Ably.Rest | null = null

function getAblyRest(): Ably.Rest {
  if (ablyRest) return ablyRest
  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) throw new Error('ABLY_API_KEY is not configured')
  ablyRest = new Ably.Rest({ key: apiKey })
  return ablyRest
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) return rateLimitResult

    // Query user's conversation IDs for scoped capabilities
    const userConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.trainerId, profileId),
          eq(conversations.clientId, profileId)
        )
      )

    // Build per-conversation capability map
    const capability: Record<string, capabilityOp[]> = {
      'unread-messages': ['subscribe'],
    }
    for (const conv of userConvs) {
      // Raw Ably channel for new message notifications
      capability[`messages:${conv.id}`] = ['subscribe']
      // Ably Chat SDK room channel (each room creates a channel with ::$chat suffix)
      capability[`chat:${conv.id}::$chat`] = ['subscribe', 'publish', 'presence', 'history']
    }

    const rest = getAblyRest()
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: profileId,
      capability,
      ttl: 3600000, // 1 hour
    })

    return NextResponse.json(tokenRequest)
  } catch (error) {
    console.error('Ably auth error:', error)
    return createApiError('Failed to create token', 500, 'ABLY_AUTH_ERROR')
  }
}
