import { createClient } from '@/lib/supabase-browser'
import type { ConversationWithTrainerProfile, ConversationWithClientProfile } from '@/lib/types/database'

/**
 * Fetch a client's conversation with their trainer
 * Used by clients who have a single trainer
 */
export async function fetchClientConversation(userId: string): Promise<ConversationWithTrainerProfile> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!conversations_trainer_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('client_id', userId)
    .single()

  if (error) throw error

  // Supabase returns object for single FK relations, but TS infers array
  const profilesData = data.profiles
  const profiles = Array.isArray(profilesData)
    ? (profilesData[0] || null)
    : profilesData

  return {
    ...data,
    profiles
  } as ConversationWithTrainerProfile
}

/**
 * Fetch all conversations for a trainer with last message and unread counts.
 * Uses a single query with nested message select to avoid N+1 queries.
 */
export async function fetchTrainerConversations(userId: string): Promise<ConversationWithClientProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!conversations_client_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('trainer_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Normalize each conversation's profiles field
  return (data || []).map(conv => {
    const profilesData = conv.profiles
    const profiles = Array.isArray(profilesData)
      ? (profilesData[0] || null)
      : profilesData

    return {
      ...conv,
      profiles
    }
  }) as ConversationWithClientProfile[]
}

/**
 * Fetch conversation info by ID
 * Returns the other party's profile (client for trainers, trainer for clients)
 */
export async function fetchConversationById(
  conversationId: string,
  isTrainer: boolean
): Promise<ConversationWithClientProfile | ConversationWithTrainerProfile> {
  const supabase = createClient()
  const foreignKey = isTrainer
    ? 'conversations_client_id_fkey'
    : 'conversations_trainer_id_fkey'

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!${foreignKey} (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', conversationId)
    .single()

  if (error) throw error

  // Supabase returns object for single FK relations, but TS infers array
  const profilesData = data.profiles
  const profiles = Array.isArray(profilesData)
    ? (profilesData[0] || null)
    : profilesData

  return {
    ...data,
    profiles
  } as ConversationWithClientProfile | ConversationWithTrainerProfile
}

/**
 * Get last messages for multiple conversations in a single query.
 * Returns a map of conversationId -> last message data.
 */
export async function getLastMessagesForConversations(conversationIds: string[]) {
  if (conversationIds.length === 0) return new Map()

  const supabase = createClient()

  // Fetch the most recent message per conversation using a single query
  // Order by created_at desc to get latest first, then deduplicate client-side
  const { data } = await supabase
    .from('messages')
    .select('conversation_id, content, created_at, sender_id')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  const result = new Map<string, { content: string | null; created_at: string; sender_id: string }>()

  // First message per conversation_id is the latest (due to ordering)
  for (const msg of data || []) {
    if (!result.has(msg.conversation_id)) {
      result.set(msg.conversation_id, msg)
    }
  }

  return result
}

/**
 * Get unread counts for multiple conversations in a single query.
 * Returns a map of conversationId -> unread count.
 */
export async function getUnreadCountsForConversations(conversationIds: string[], userId: string) {
  if (conversationIds.length === 0) return new Map()

  const supabase = createClient()

  const { data } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .is('read_at', null)

  const counts = new Map<string, number>()
  for (const msg of data || []) {
    counts.set(msg.conversation_id, (counts.get(msg.conversation_id) || 0) + 1)
  }

  return counts
}

/**
 * Get the last message for a conversation
 * Returns the most recent message's content, created_at, and sender_id
 */
export async function getLastMessage(conversationId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from('messages')
    .select('content, created_at, sender_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

/**
 * Get unread count for a user in a conversation
 */
export async function getUnreadCount(conversationId: string, userId: string) {
  const supabase = createClient()

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null)

  return count || 0
}
