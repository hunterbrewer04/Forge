/**
 * Conversation Messages API Routes
 *
 * GET  /api/conversations/[id]/messages
 *   Returns all messages for the conversation ordered by createdAt asc,
 *   each including the sender's profile.
 *
 * POST /api/conversations/[id]/messages
 *   Sends a new text or media message.
 *   Body: { content?: string, media_url?: string, media_type?: 'image' | 'video' }
 *   At least one of content or media_url must be provided.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessage(msg: {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
  createdAt: Date
  readAt: Date | null
  sender?: { id: string; fullName: string | null; avatarUrl: string | null } | null
}) {
  return {
    id: msg.id,
    conversation_id: msg.conversationId,
    sender_id: msg.senderId,
    content: msg.content,
    media_url: msg.mediaUrl,
    media_type: msg.mediaType,
    created_at: msg.createdAt,
    read_at: msg.readAt,
    profiles: msg.sender
      ? {
          id: msg.sender.id,
          full_name: msg.sender.fullName,
          avatar_url: msg.sender.avatarUrl,
        }
      : null,
  }
}

/** Verify the requesting user is a participant. Returns the conversation or null. */
async function getConversationForParticipant(id: string, profileId: string) {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    columns: { id: true, clientId: true, trainerId: true },
  })

  if (!conv) return null
  if (conv.clientId !== profileId && conv.trainerId !== profileId) return null
  return conv
}

// ---------------------------------------------------------------------------
// GET /api/conversations/[id]/messages
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

    // 3. Verify participant access
    const conv = await getConversationForParticipant(id, profileId)
    if (!conv) {
      return createApiError('Conversation not found or access denied', 404, 'RESOURCE_NOT_FOUND')
    }

    // 4. Fetch messages with sender profile
    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      with: {
        sender: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: [asc(messages.createdAt)],
    })

    return NextResponse.json({
      success: true,
      messages: msgs.map(formatMessage),
    })
  } catch (error) {
    return handleUnexpectedError(error, 'messages-list')
  }
}

// ---------------------------------------------------------------------------
// POST /api/conversations/[id]/messages
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Rate limit (messaging preset: 30 req/min)
    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.MESSAGING, profileId)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Verify participant access
    const conv = await getConversationForParticipant(id, profileId)
    if (!conv) {
      return createApiError('Conversation not found or access denied', 404, 'RESOURCE_NOT_FOUND')
    }

    // 4. Parse and validate body
    let body: { content?: string; media_url?: string; media_type?: string }
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    const content = typeof body.content === 'string' ? body.content.trim() : null
    const mediaUrl = typeof body.media_url === 'string' ? body.media_url.trim() : null
    const mediaType = body.media_type === 'image' || body.media_type === 'video' ? body.media_type : null

    if (!content && !mediaUrl) {
      return createApiError(
        'Message must include either content or media_url',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (mediaUrl && !mediaType) {
      return createApiError(
        'media_type is required when media_url is provided ("image" or "video")',
        400,
        'VALIDATION_ERROR'
      )
    }

    // 5. Insert message
    const [inserted] = await db
      .insert(messages)
      .values({
        conversationId: id,
        senderId: profileId,
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
      })
      .returning()

    // 6. Return the new message with sender profile
    const msgWithSender = await db.query.messages.findFirst({
      where: eq(messages.id, inserted.id),
      with: {
        sender: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
      },
    })

    if (!msgWithSender) {
      return createApiError('Failed to fetch inserted message', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json(
      { success: true, message: formatMessage(msgWithSender) },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'messages-send')
  }
}
