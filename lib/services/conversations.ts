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
  ConversationWithClientProfileEnriched,
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
): Promise<ConversationWithClientProfileEnriched[]> {
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
    } as ConversationWithClientProfileEnriched
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
