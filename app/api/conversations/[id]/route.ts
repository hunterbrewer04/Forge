/**
 * Single Conversation API Route
 *
 * GET /api/conversations/[id]
 *   Returns the conversation with both the client and trainer profiles.
 *   The requesting user must be a participant (clientId or trainerId).
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

function formatProfile(
  p: { id: string; fullName: string | null; avatarUrl: string | null; email: string | null } | null | undefined
) {
  if (!p) return null
  return {
    id: p.id,
    full_name: p.fullName,
    avatar_url: p.avatarUrl,
    email: p.email,
  }
}

// ---------------------------------------------------------------------------
// GET /api/conversations/[id]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Rate limit
    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Fetch conversation with both profiles
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: {
        client: {
          columns: { id: true, fullName: true, avatarUrl: true, email: true },
        },
        trainer: {
          columns: { id: true, fullName: true, avatarUrl: true, email: true },
        },
      },
    })

    if (!conv) {
      return createApiError('Conversation not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 4. Verify the requesting user is a participant
    const isParticipant = conv.clientId === profileId || conv.trainerId === profileId
    if (!isParticipant) {
      return createApiError('You do not have access to this conversation', 403, 'FORBIDDEN')
    }

    return NextResponse.json({
      success: true,
      conversation: {
        id: conv.id,
        client_id: conv.clientId,
        trainer_id: conv.trainerId,
        created_at: conv.createdAt,
        client: formatProfile(conv.client),
        trainer: formatProfile(conv.trainer),
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'conversation-get')
  }
}
