import { createClient } from '@/lib/supabase-browser'
import type { ClientProfileJoin } from '@/lib/types/database'

interface ConversationWithClient {
  id: string
  client_id: string
  profiles: ClientProfileJoin | ClientProfileJoin[] | null
}

/**
 * Fetch the list of clients for a trainer via their conversations.
 * Each conversation links to a client profile via FK join.
 */
export async function fetchTrainerClientList(trainerId: string): Promise<ClientProfileJoin[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      profiles!conversations_client_id_fkey (
        id,
        full_name,
        avatar_url,
        username,
        email,
        created_at
      )
    `)
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Normalize FK join (array | object | null) and extract client profiles
  return (data as ConversationWithClient[] || [])
    .map(conv => {
      const profile = Array.isArray(conv.profiles)
        ? conv.profiles[0] ?? null
        : conv.profiles
      return profile
    })
    .filter((p): p is ClientProfileJoin => p !== null)
}

/**
 * Fetch a single client's profile detail for a trainer.
 * Verifies the trainer-client relationship exists via conversations.
 */
export async function fetchClientDetail(
  trainerId: string,
  clientId: string
): Promise<ClientProfileJoin & { conversation_id: string }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      profiles!conversations_client_id_fkey (
        id,
        full_name,
        avatar_url,
        username,
        email,
        created_at
      )
    `)
    .eq('trainer_id', trainerId)
    .eq('client_id', clientId)
    .single()

  if (error) throw error

  const conv = data as ConversationWithClient
  const profile = Array.isArray(conv.profiles)
    ? conv.profiles[0] ?? null
    : conv.profiles

  if (!profile) throw new Error('Client profile not found')

  return { ...profile, conversation_id: conv.id }
}
