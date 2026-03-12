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
import { validateAuth, validateRole } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { conversations, messages, profiles } from '@/lib/db/schema'
import { eq, desc, and, ne, isNull, count } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { z } from 'zod'

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

function formatConversation(
  conv: { id: string; clientId: string; trainerId: string; createdAt: Date } | null | undefined
) {
  if (!conv) return null
  return {
    id: conv.id,
    client_id: conv.clientId,
    trainer_id: conv.trainerId,
    created_at: conv.createdAt,
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

// ---------------------------------------------------------------------------
// POST /api/conversations
// ---------------------------------------------------------------------------

const createConversationSchema = z.object({
  client_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, createConversationSchema)
    if (body instanceof NextResponse) return body

    // Verify the client_id belongs to a valid member (not a trainer)
    const client = await db.query.profiles.findFirst({
      where: and(
        eq(profiles.id, body.client_id),
        eq(profiles.isTrainer, false)
      ),
      columns: { id: true, isMember: true, hasFullAccess: true },
    })

    if (!client) {
      return createApiError('Client not found or is not a valid member', 404, 'RESOURCE_NOT_FOUND')
    }

    if (!client.isMember && !client.hasFullAccess) {
      return createApiError('Client does not have member access', 400, 'VALIDATION_ERROR')
    }

    // Check if conversation already exists
    const existing = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.trainerId, profileId),
        eq(conversations.clientId, body.client_id)
      ),
      columns: { id: true, clientId: true, trainerId: true, createdAt: true },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        existing: true,
        conversation: formatConversation(existing),
      })
    }

    // Insert new conversation (onConflictDoNothing as race condition safety)
    const [newConv] = await db
      .insert(conversations)
      .values({
        trainerId: profileId,
        clientId: body.client_id,
      })
      .onConflictDoNothing()
      .returning()

    // If onConflictDoNothing swallowed a race condition, fetch the existing one
    if (!newConv) {
      const raceConv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.trainerId, profileId),
          eq(conversations.clientId, body.client_id)
        ),
        columns: { id: true, clientId: true, trainerId: true, createdAt: true },
      })

      return NextResponse.json({
        success: true,
        existing: true,
        conversation: formatConversation(raceConv),
      })
    }

    return NextResponse.json(
      {
        success: true,
        existing: false,
        conversation: formatConversation(newConv),
      },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'create-conversation')
  }
}
