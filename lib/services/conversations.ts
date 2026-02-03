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
 * Fetch all conversations for a trainer
 * Returns list of conversations with client profiles
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
 * Note: This will return 0 until Phase 4 adds the read_at field
 * Currently checking for messages where sender is not the current user
 * and read_at is null (field doesn't exist yet)
 */
export async function getUnreadCount(conversationId: string, userId: string) {
  const supabase = createClient()

  // Note: read_at field doesn't exist yet (Phase 4)
  // This query will work once the field is added
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null)

  return count || 0
}
