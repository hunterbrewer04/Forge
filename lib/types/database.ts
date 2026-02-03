// Database types based on Supabase schema
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  is_trainer: boolean
  is_client: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  created_at: string
  // With relations
  client?: Profile
  trainer?: Profile
  profiles?: Profile  // For foreign key joins
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  created_at: string
  read_at?: string | null
  // With relations
  sender?: Profile
  profiles?: Profile  // For foreign key joins
}

// Supabase query response types for foreign key joins
// When using !conversations_client_id_fkey, the profile is returned as `profiles`
export interface ProfileJoin {
  id?: string
  full_name: string | null
  avatar_url?: string | null
}

// Conversation with client profile via foreign key
export interface ConversationWithClientProfile {
  id: string
  client_id: string
  trainer_id: string
  created_at?: string
  profiles: ProfileJoin | null
}

// Conversation with trainer profile via foreign key
export interface ConversationWithTrainerProfile {
  id: string
  client_id: string
  trainer_id: string
  created_at?: string
  profiles: ProfileJoin | null
  trainer?: ProfileJoin | null  // Alternative key for named relation
}

// Message with sender profile via foreign key
export interface MessageWithSenderProfile {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  created_at: string
  read_at?: string | null
  profiles: ProfileJoin | null
}
