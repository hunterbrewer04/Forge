/**
 * Conversations service — client-side fetch wrappers
 *
 * All queries now go through the API routes, which handle authentication
 * and database access server-side. The `userId` parameters are kept for
 * backward compatibility with existing callers but are no longer used
 * for the actual queries (auth is resolved server-side via Clerk).
 */

import type {
  ConversationWithTrainerProfile,
  ConversationWithClientProfile,
} from '@/lib/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailableClient {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export interface CreateConversationResponse {
  success: boolean
  existing: boolean
  conversation: {
    id: string
    client_id: string
    trainer_id: string
    created_at: string
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a client's conversation with their trainer.
 * Used by clients who have a single trainer.
 */
export async function fetchClientConversation(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<ConversationWithTrainerProfile | null> {
  const res = await fetch('/api/conversations?role=client')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch conversation')
  }
  const data = await res.json()
  // API returns { success, conversation } — map to the shape callers expect
  if (!data.conversation) return null
  const conv = data.conversation
  return {
    id: conv.id,
    client_id: conv.client_id,
    trainer_id: conv.trainer_id,
    created_at: conv.created_at,
    profiles: conv.trainer
      ? { id: conv.trainer.id, full_name: conv.trainer.full_name, avatar_url: conv.trainer.avatar_url }
      : null,
  } as ConversationWithTrainerProfile
}

/**
 * Fetch all conversations for a trainer.
 * Returns a list of conversations with client profiles.
 */
export async function fetchTrainerConversations(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<ConversationWithClientProfile[]> {
  const res = await fetch('/api/conversations?role=trainer')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch conversations')
  }
  const data = await res.json()
  // API returns { success, conversations } — map to the shape callers expect
  // Include last_message and unread_count so callers don't need separate fetches
  return ((data.conversations as unknown[]) ?? []).map((conv: unknown) => {
    const c = conv as {
      id: string
      client_id: string
      trainer_id: string
      created_at: string
      client: { id: string; full_name: string | null; avatar_url: string | null } | null
      last_message: { content: string | null; created_at: string; sender_id: string } | null
      unread_count: number
    }
    return {
      id: c.id,
      client_id: c.client_id,
      trainer_id: c.trainer_id,
      created_at: c.created_at,
      profiles: c.client
        ? { id: c.client.id, full_name: c.client.full_name, avatar_url: c.client.avatar_url }
        : null,
      last_message: c.last_message ?? null,
      unread_count: c.unread_count ?? 0,
    } as ConversationWithClientProfile & {
      last_message: { content: string | null; created_at: string; sender_id: string } | null
      unread_count: number
    }
  })
}

/**
 * Fetch conversation info by ID.
 * Returns the other party's profile (client for trainers, trainer for clients).
 */
export async function fetchConversationById(
  conversationId: string,
  isTrainer: boolean
): Promise<ConversationWithClientProfile | ConversationWithTrainerProfile> {
  const res = await fetch(`/api/conversations/${conversationId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch conversation')
  }
  const data = await res.json()
  const conv = data.conversation as {
    id: string
    client_id: string
    trainer_id: string
    created_at: string
    client: { id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null
    trainer: { id: string; full_name: string | null; avatar_url: string | null; email: string | null } | null
  }

  // Return the other party's profile under the `profiles` key to match existing interface
  const otherProfile = isTrainer ? conv.client : conv.trainer
  return {
    id: conv.id,
    client_id: conv.client_id,
    trainer_id: conv.trainer_id,
    created_at: conv.created_at,
    profiles: otherProfile
      ? { id: otherProfile.id, full_name: otherProfile.full_name, avatar_url: otherProfile.avatar_url }
      : null,
  } as ConversationWithClientProfile | ConversationWithTrainerProfile
}

/**
 * Get last messages for multiple conversations in a single request.
 * Returns a map of conversationId -> last message data.
 *
 * NOTE: The new API embeds last_message directly in each conversation response
 * from GET /api/conversations. This helper is retained for callers that still
 * need to look up last messages independently; it calls the conversations list
 * and builds the map from the enriched response.
 */
export async function getLastMessagesForConversations(
  conversationIds: string[]
): Promise<Map<string, { content: string | null; created_at: string; sender_id: string }>> {
  if (conversationIds.length === 0) return new Map()

  // Fetch the trainer conversation list (which includes last_message per conv)
  // and build the map from what the API already returns.
  const res = await fetch('/api/conversations?role=trainer')
  if (!res.ok) return new Map()
  const data = await res.json()

  const result = new Map<string, { content: string | null; created_at: string; sender_id: string }>()
  for (const conv of (data.conversations ?? []) as Array<{
    id: string
    last_message: { content: string | null; created_at: string; sender_id: string } | null
  }>) {
    if (conv.last_message && conversationIds.includes(conv.id)) {
      result.set(conv.id, conv.last_message)
    }
  }
  return result
}

/**
 * Get unread counts for multiple conversations in a single request.
 * Returns a map of conversationId -> unread count.
 *
 * NOTE: The new API embeds unread_count directly in each conversation response.
 * This helper is retained for backward compatibility; it builds the map from
 * the enriched conversation list response.
 */
export async function getUnreadCountsForConversations(
  conversationIds: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<Map<string, number>> {
  if (conversationIds.length === 0) return new Map()

  const res = await fetch('/api/conversations?role=trainer')
  if (!res.ok) return new Map()
  const data = await res.json()

  const counts = new Map<string, number>()
  for (const conv of (data.conversations ?? []) as Array<{
    id: string
    unread_count: number
  }>) {
    if (conversationIds.includes(conv.id)) {
      counts.set(conv.id, conv.unread_count ?? 0)
    }
  }
  return counts
}

/**
 * Get the last message for a single conversation.
 */
export async function getLastMessage(
  conversationId: string
): Promise<{ content: string | null; created_at: string; sender_id: string } | null> {
  // Leverage the single-conversation endpoint which returns last_message
  const res = await fetch(`/api/conversations/${conversationId}`)
  if (!res.ok) return null
  // The single-conversation endpoint does not yet return last_message in the
  // response body, so fall back to the messages endpoint.
  const messagesRes = await fetch(`/api/conversations/${conversationId}/messages`)
  if (!messagesRes.ok) return null
  const data = await messagesRes.json()
  const msgs = (data.messages ?? []) as Array<{
    content: string | null
    created_at: string
    sender_id: string
  }>
  return msgs.length > 0 ? msgs[msgs.length - 1] : null
}

/**
 * Get unread count for a user in a single conversation.
 */
export async function getUnreadCount(
  conversationId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string
): Promise<number> {
  // Use the trainer list to pick up the embedded unread_count.
  // For a lightweight single-conversation call, use the enriched trainer list.
  const res = await fetch('/api/conversations?role=trainer')
  if (!res.ok) return 0
  const data = await res.json()
  const conv = ((data.conversations ?? []) as Array<{ id: string; unread_count: number }>).find(
    (c) => c.id === conversationId
  )
  return conv?.unread_count ?? 0
}

// ---------------------------------------------------------------------------
// Trainer: new conversation creation
// ---------------------------------------------------------------------------

/**
 * Fetch clients available for a new conversation (no existing conversation with this trainer).
 */
export async function fetchAvailableClients(): Promise<AvailableClient[]> {
  const res = await fetch('/api/conversations/available-clients')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch available clients')
  }
  const data = await res.json()
  return data.clients ?? []
}

/**
 * Create a new conversation with a client.
 */
export async function createConversation(clientId: string): Promise<CreateConversationResponse> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to create conversation')
  }
  return res.json()
}
