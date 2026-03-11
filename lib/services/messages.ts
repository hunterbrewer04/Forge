/**
 * Messages service — client-side fetch wrappers
 *
 * All queries now go through the API routes, which handle authentication
 * and database access server-side. The `userId` / `senderId` parameters
 * that were previously used for direct Supabase queries are kept where
 * needed for backward compatibility with callers but are no longer used
 * for the actual requests (auth is resolved server-side via Clerk).
 */

import type { MessageWithSenderProfile } from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Fetch messages
// ---------------------------------------------------------------------------

/**
 * Fetch all messages for a conversation, ordered oldest-first.
 * Each message includes the sender's profile under the `profiles` key.
 */
export async function fetchMessages(conversationId: string): Promise<MessageWithSenderProfile[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch messages')
  }
  const data = await res.json()
  return (data.messages ?? []) as MessageWithSenderProfile[]
}

// ---------------------------------------------------------------------------
// Send messages
// ---------------------------------------------------------------------------

/**
 * Send a text message.
 */
export async function sendTextMessage(params: {
  conversationId: string
  senderId: string
  content: string
}): Promise<MessageWithSenderProfile> {
  const res = await fetch(`/api/conversations/${params.conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: params.content }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to send message')
  }
  const data = await res.json()
  return data.message as MessageWithSenderProfile
}

/**
 * Send a media message (image or video).
 */
export async function sendMediaMessage(params: {
  conversationId: string
  senderId: string
  mediaUrl: string
  mediaType: 'image' | 'video'
}): Promise<MessageWithSenderProfile> {
  const res = await fetch(`/api/conversations/${params.conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_url: params.mediaUrl,
      media_type: params.mediaType,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to send media message')
  }
  const data = await res.json()
  return data.message as MessageWithSenderProfile
}

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

/**
 * Mark all unread messages in a conversation as read.
 * Only marks messages sent by the other party (handled server-side).
 */
export async function markMessagesAsRead(
  conversationId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}/messages/read`, {
    method: 'PATCH',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to mark messages as read')
  }
}

// ---------------------------------------------------------------------------
// Sender profile (legacy — sender is now embedded in message responses)
// ---------------------------------------------------------------------------

/**
 * Fetch a sender's profile.
 *
 * @deprecated Sender profile is now included in every message returned by
 * GET /api/conversations/[id]/messages and POST /api/conversations/[id]/messages.
 * This function is retained for callers that trigger on real-time Ably events
 * and need to enrich a bare message with a profile. Consider fetching the full
 * message from the API instead.
 */
export async function fetchSenderProfile(
  senderId: string
): Promise<{ id: string; full_name: string | null; avatar_url: string | null } | null> {
  // There is no dedicated profile endpoint that accepts a UUID directly.
  // Callers using real-time subscriptions should re-fetch the message list
  // from GET /api/conversations/[id]/messages after receiving a new-message event.
  console.warn(
    '[fetchSenderProfile] This function is deprecated. ' +
    'Sender profiles are now embedded in message API responses. ' +
    `Attempted lookup for senderId: ${senderId}`
  )
  return null
}
