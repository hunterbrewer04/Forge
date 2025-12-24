import { createClient } from '@/lib/supabase-browser'
import type { MessageWithSenderProfile } from '@/lib/types/database'

/**
 * Fetch all messages for a conversation
 * Returns messages with sender profile information
 */
export async function fetchMessages(conversationId: string): Promise<MessageWithSenderProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      media_url,
      media_type,
      created_at,
      profiles!messages_sender_id_fkey (
        id,
        full_name
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error

  // Normalize each message's profiles field
  return (data || []).map(msg => {
    const profilesData = msg.profiles
    const profiles = Array.isArray(profilesData)
      ? (profilesData[0] || null)
      : profilesData

    return {
      ...msg,
      profiles
    }
  }) as MessageWithSenderProfile[]
}

/**
 * Send a text message
 */
export async function sendTextMessage(params: {
  conversationId: string
  senderId: string
  content: string
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      content: params.content.trim(),
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Send a media message (image or video)
 */
export async function sendMediaMessage(params: {
  conversationId: string
  senderId: string
  mediaUrl: string
  mediaType: 'image' | 'video'
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      content: null,
      media_url: params.mediaUrl,
      media_type: params.mediaType,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch sender profile for a message (used in real-time updates)
 */
export async function fetchSenderProfile(senderId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', senderId)
    .single()

  if (error) throw error
  return data
}
