/**
 * Mark Messages As Read API Route
 *
 * PATCH /api/conversations/[id]/messages/read
 *   Marks all unread messages in the conversation as read where the sender
 *   is NOT the current user. Idempotent — safe to call on every conversation open.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema'
import { eq, and, ne, isNull } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { publishReadReceipt } from '@/modules/messaging'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// PATCH /api/conversations/[id]/messages/read
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // 3. Verify the requesting user is a participant
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      columns: { id: true, clientId: true, trainerId: true },
    })

    if (!conv) {
      return createApiError('Conversation not found', 404, 'RESOURCE_NOT_FOUND')
    }

    const isParticipant = conv.clientId === profileId || conv.trainerId === profileId
    if (!isParticipant) {
      return createApiError('You do not have access to this conversation', 403, 'FORBIDDEN')
    }

    // 4. Mark all unread messages from the other party as read
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, id),
          ne(messages.senderId, profileId),
          isNull(messages.readAt)
        )
      )

    // Publish read receipt to Ably (best-effort)
    try {
      await publishReadReceipt(id, {
        reader_id: profileId,
        read_at: new Date().toISOString(),
      })
    } catch (ablyError) {
      console.error('Ably read receipt publish error:', ablyError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'messages-mark-read')
  }
}
