// Session & Booking types based on Supabase schema

export type SessionStatus = 'scheduled' | 'cancelled' | 'completed'
export type BookingStatus = 'confirmed' | 'cancelled' | 'attended' | 'no_show'

export interface SessionType {
  id: string
  name: string
  slug: string
  color: string
  icon: string
  is_premium: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  trainer_id: string
  session_type_id: string | null
  title: string
  description: string | null
  duration_minutes: number
  capacity: number | null
  is_premium: boolean
  location: string | null
  starts_at: string
  ends_at: string
  status: SessionStatus
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  // With relations
  session_type?: SessionType | null
  trainer?: {
    id: string
    full_name: string | null
    avatar_url?: string | null
  } | null
  // Computed field from get_session_availability
  availability?: SessionAvailability
}

export interface Booking {
  id: string
  session_id: string
  client_id: string
  status: BookingStatus
  booked_at: string
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  // With relations
  session?: Session | null
  client?: {
    id: string
    full_name: string | null
    avatar_url?: string | null
  } | null
}

export interface SessionAvailability {
  capacity: number
  booked_count: number
  spots_left: number
  is_full: boolean
}

// Session with all related data for display
export interface SessionWithDetails extends Session {
  session_type: SessionType | null
  trainer: {
    id: string
    full_name: string | null
    avatar_url?: string | null
  } | null
  availability: SessionAvailability
  user_booking?: Booking | null // Current user's booking for this session
}

// Booking with session details for client's booking list
export interface BookingWithSession extends Booking {
  session: Session & {
    session_type?: SessionType | null
    trainer?: {
      id: string
      full_name: string | null
      avatar_url?: string | null
    } | null
  }
}

// Input types for creating/updating

export interface CreateSessionInput {
  trainer_id: string
  session_type_id?: string | null
  title: string
  description?: string | null
  duration_minutes?: number
  capacity?: number | null
  is_premium?: boolean
  location?: string | null
  starts_at: string
  ends_at: string
}

export interface UpdateSessionInput {
  session_type_id?: string | null
  title?: string
  description?: string | null
  duration_minutes?: number
  capacity?: number | null
  is_premium?: boolean
  location?: string | null
  starts_at?: string
  ends_at?: string
  status?: SessionStatus
  cancellation_reason?: string | null
}

export interface CancelBookingInput {
  cancellation_reason?: string | null
}

// Response types for database functions

export interface BookSessionResult {
  success: boolean
  booking_id: string | null
  error_message: string | null
}

// Filter types for querying

export interface SessionFilters {
  date?: string // YYYY-MM-DD
  from?: string // ISO date
  to?: string // ISO date
  type?: string // session_type slug
  trainer_id?: string
  include_full?: boolean // Include fully booked sessions (default: true)
  status?: SessionStatus
}

export interface BookingFilters {
  status?: BookingStatus
  upcoming?: boolean // Only future sessions (default: true)
}
