/**
 * Client-side service for bookings.
 * Uses browser Supabase client - do not call from server components or API routes.
 * For server-side usage, use the API routes instead.
 */
import { createClient } from '@/lib/supabase-browser'
import type {
  Booking,
  BookingWithSession,
  BookSessionResult,
  BookingFilters,
  CancelBookingInput,
} from '@/lib/types/sessions'

/**
 * Book a session using the atomic database function
 * This handles capacity checks and prevents race conditions
 */
export async function bookSession(
  sessionId: string,
  clientId: string
): Promise<BookSessionResult> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('book_session', {
    p_session_id: sessionId,
    p_client_id: clientId,
  })

  if (error) throw error

  // The function returns an array with one row
  const result = data?.[0] || {
    success: false,
    booking_id: null,
    error_message: 'Unknown error occurred',
  }

  return result
}

/**
 * Cancel a booking
 */
export async function cancelBooking(
  bookingId: string,
  input?: CancelBookingInput
): Promise<Booking> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: input?.cancellation_reason || null,
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Fetch a single booking by ID
 */
export async function fetchBookingById(
  bookingId: string
): Promise<BookingWithSession | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      session:sessions(
        *,
        session_type:session_types(*),
        trainer:profiles!sessions_trainer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  // Handle Supabase FK join format
  const session = Array.isArray(data.session)
    ? data.session[0] || null
    : data.session

  if (session) {
    session.session_type = Array.isArray(session.session_type)
      ? session.session_type[0] || null
      : session.session_type
    session.trainer = Array.isArray(session.trainer)
      ? session.trainer[0] || null
      : session.trainer
  }

  return {
    ...data,
    session,
  } as BookingWithSession
}

/**
 * Fetch bookings for the current user
 */
export async function fetchUserBookings(
  filters: BookingFilters = {}
): Promise<BookingWithSession[]> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  if (!userId) throw new Error('User not authenticated')

  let query = supabase
    .from('bookings')
    .select(`
      *,
      session:sessions(
        *,
        session_type:session_types(*),
        trainer:profiles!sessions_trainer_id_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('client_id', userId)
    .order('booked_at', { ascending: false })

  // Filter by status
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data: bookings, error } = await query

  if (error) throw error
  if (!bookings) return []

  // Process bookings and filter by upcoming if needed
  const processedBookings = bookings.map((booking) => {
    // Handle Supabase FK join format
    const session = Array.isArray(booking.session)
      ? booking.session[0] || null
      : booking.session

    if (session) {
      session.session_type = Array.isArray(session.session_type)
        ? session.session_type[0] || null
        : session.session_type
      session.trainer = Array.isArray(session.trainer)
        ? session.trainer[0] || null
        : session.trainer
    }

    return {
      ...booking,
      session,
    } as BookingWithSession
  })

  // Filter for upcoming sessions only
  if (filters.upcoming !== false) {
    const now = new Date().toISOString()
    return processedBookings.filter(
      (b) => b.session && b.session.starts_at >= now
    )
  }

  return processedBookings
}

/**
 * Fetch bookings for a specific session (for trainers)
 */
export async function fetchSessionBookings(
  sessionId: string
): Promise<Booking[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      client:profiles!bookings_client_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('session_id', sessionId)
    .eq('status', 'confirmed')
    .order('booked_at', { ascending: true })

  if (error) throw error

  // Handle Supabase FK join format
  return (data || []).map((booking) => {
    const client = Array.isArray(booking.client)
      ? booking.client[0] || null
      : booking.client
    return {
      ...booking,
      client,
    }
  }) as Booking[]
}

/**
 * Check if user has booked a specific session
 */
export async function hasUserBookedSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('session_id', sessionId)
    .eq('client_id', userId)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) throw error
  return data !== null
}

/**
 * Get user's booking for a specific session
 */
export async function getUserBookingForSession(
  sessionId: string,
  userId: string
): Promise<Booking | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('client_id', userId)
    .eq('status', 'confirmed')
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Mark booking as attended (trainer only)
 */
export async function markBookingAttended(bookingId: string): Promise<Booking> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'attended' })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Mark booking as no-show (trainer only)
 */
export async function markBookingNoShow(bookingId: string): Promise<Booking> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'no_show' })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get booking count for a user (confirmed bookings only)
 */
export async function getUserBookingCount(userId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', userId)
    .eq('status', 'confirmed')

  if (error) throw error
  return count || 0
}
