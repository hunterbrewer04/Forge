/**
 * Conversations API Routes
 *
 * GET /api/conversations?role=trainer|client
 *   - trainer: returns all conversations where trainerId = profileId, each
 *              enriched with the client profile, last message, and unread count
 *   - client:  returns the single conversation where clientId = profileId,
 *              enriched with the trainer profile, last message, and unread count
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations, messages } from '@/lib/db/schema'
import { eq, desc, and, ne, isNull, count } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatProfile(p: { id: string; fullName: string | null; avatarUrl: string | null } | null | undefined) {
  if (!p) return null
  return {
    id: p.id,
    full_name: p.fullName,
    avatar_url: p.avatarUrl,
  }
}

function formatLastMessage(
  msg: { content: string | null; createdAt: Date; senderId: string } | null | undefined
) {
  if (!msg) return null
  return {
    content: msg.content,
    created_at: msg.createdAt,
    sender_id: msg.senderId,
  }
}

// ---------------------------------------------------------------------------
// GET /api/conversations
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
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

    // 3. Determine mode from query param
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    if (role !== 'trainer' && role !== 'client') {
      return createApiError(
        'Missing or invalid query param: role must be "trainer" or "client"',
        400,
        'VALIDATION_ERROR'
      )
    }

    // -----------------------------------------------------------------------
    // Trainer: all conversations + client profile + last message + unread count
    // -----------------------------------------------------------------------
    if (role === 'trainer') {
      const convRows = await db.query.conversations.findMany({
        where: eq(conversations.trainerId, profileId),
        with: {
          client: {
            columns: { id: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: [desc(conversations.createdAt)],
      })

      // Enrich each conversation with last message and unread count in parallel
      const enriched = await Promise.all(
        convRows.map(async (conv) => {
          const [lastMsg, unreadRows] = await Promise.all([
            db.query.messages.findFirst({
              where: eq(messages.conversationId, conv.id),
              columns: { content: true, createdAt: true, senderId: true },
              orderBy: [desc(messages.createdAt)],
            }),
            db
              .select({ value: count() })
              .from(messages)
              .where(
                and(
                  eq(messages.conversationId, conv.id),
                  ne(messages.senderId, profileId),
                  isNull(messages.readAt)
                )
              ),
          ])

          return {
            id: conv.id,
            client_id: conv.clientId,
            trainer_id: conv.trainerId,
            created_at: conv.createdAt,
            client: formatProfile(conv.client),
            last_message: formatLastMessage(lastMsg),
            unread_count: unreadRows[0]?.value ?? 0,
          }
        })
      )

      return NextResponse.json({ success: true, conversations: enriched })
    }

    // -----------------------------------------------------------------------
    // Client: single conversation + trainer profile + last message + unread count
    // -----------------------------------------------------------------------
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.clientId, profileId),
      with: {
        trainer: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
      },
    })

    if (!conv) {
      return NextResponse.json({ success: true, conversation: null })
    }

    const [lastMsg, unreadRows] = await Promise.all([
      db.query.messages.findFirst({
        where: eq(messages.conversationId, conv.id),
        columns: { content: true, createdAt: true, senderId: true },
        orderBy: [desc(messages.createdAt)],
      }),
      db
        .select({ value: count() })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            ne(messages.senderId, profileId),
            isNull(messages.readAt)
          )
        ),
    ])

    return NextResponse.json({
      success: true,
      conversation: {
        id: conv.id,
        client_id: conv.clientId,
        trainer_id: conv.trainerId,
        created_at: conv.createdAt,
        trainer: formatProfile(conv.trainer),
        last_message: formatLastMessage(lastMsg),
        unread_count: unreadRows[0]?.value ?? 0,
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'conversations-list')
  }
}
