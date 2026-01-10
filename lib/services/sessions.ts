/**
 * Client-side service for sessions.
 * Uses browser Supabase client - do not call from server components or API routes.
 * For server-side usage, use the API routes instead.
 */
import { createClient } from '@/lib/supabase-browser'
import type {
  Session,
  SessionType,
  SessionWithDetails,
  SessionAvailability,
  CreateSessionInput,
  UpdateSessionInput,
  SessionFilters,
} from '@/lib/types/sessions'

/**
 * Fetch all session types for filtering and display
 */
export async function fetchSessionTypes(): Promise<SessionType[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('session_types')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

/**
 * Fetch a single session type by slug
 */
export async function fetchSessionTypeBySlug(slug: string): Promise<SessionType | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('session_types')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

/**
 * Fetch sessions with optional filters
 * Returns sessions with session type, trainer info, and availability
 */
export async function fetchSessions(
  filters: SessionFilters = {}
): Promise<SessionWithDetails[]> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  let query = supabase
    .from('sessions')
    .select(`
      *,
      session_type:session_types(*),
      trainer:profiles!sessions_trainer_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('status', filters.status || 'scheduled')
    .order('starts_at', { ascending: true })

  // Apply date filters
  if (filters.date) {
    const startOfDay = `${filters.date}T00:00:00.000Z`
    const endOfDay = `${filters.date}T23:59:59.999Z`
    query = query.gte('starts_at', startOfDay).lte('starts_at', endOfDay)
  } else if (filters.from || filters.to) {
    if (filters.from) {
      query = query.gte('starts_at', filters.from)
    }
    if (filters.to) {
      query = query.lte('starts_at', filters.to)
    }
  }

  // Filter by session type
  if (filters.type) {
    const sessionType = await fetchSessionTypeBySlug(filters.type)
    if (sessionType) {
      query = query.eq('session_type_id', sessionType.id)
    }
  }

  // Filter by trainer
  if (filters.trainer_id) {
    query = query.eq('trainer_id', filters.trainer_id)
  }

  const { data: sessions, error } = await query

  if (error) throw error
  if (!sessions) return []

  // Fetch availability in batch (Issue #14 - N+2 query optimization)
  const sessionIds = sessions.map((s) => s.id)

  // Get batch availability - single query instead of N queries
  const { data: availabilityData } = sessionIds.length > 0
    ? await supabase.rpc('get_sessions_availability_batch', { p_session_ids: sessionIds })
    : { data: [] }

  // Get user bookings in batch - single query instead of N queries
  const { data: userBookings } = sessionIds.length > 0 && userId
    ? await supabase
        .from('bookings')
        .select('session_id, id, status')
        .in('session_id', sessionIds)
        .eq('client_id', userId)
        .eq('status', 'confirmed')
    : { data: [] }

  // Create lookup maps for O(1) access
  type AvailabilityRecord = { session_id: string; capacity: number; booked_count: number; spots_left: number; is_full: boolean }
  type BookingRecord = { session_id: string; id: string; status: string }

  const availabilityMap = new Map<string, AvailabilityRecord>(
    (availabilityData || []).map((a: AvailabilityRecord) => [a.session_id, a])
  )
  const userBookingMap = new Map<string, { id: string; status: string }>(
    (userBookings || []).map((b: BookingRecord) => [b.session_id, { id: b.id, status: b.status }])
  )

  // Map sessions with availability and booking data
  const sessionsWithDetails = sessions.map((session) => {
    const availability: SessionAvailability = availabilityMap.get(session.id) || {
      capacity: session.capacity || 1,
      booked_count: 0,
      spots_left: session.capacity || 1,
      is_full: false,
    }

    const user_booking = userBookingMap.get(session.id) || null

    // Handle Supabase FK join format
    const session_type = Array.isArray(session.session_type)
      ? session.session_type[0] || null
      : session.session_type
    const trainer = Array.isArray(session.trainer)
      ? session.trainer[0] || null
      : session.trainer

    return {
      ...session,
      session_type,
      trainer,
      availability,
      user_booking,
    } as SessionWithDetails
  })

  // Optionally filter out full sessions
  if (filters.include_full === false) {
    return sessionsWithDetails.filter((s) => !s.availability.is_full)
  }

  return sessionsWithDetails
}

/**
 * Fetch a single session by ID with full details
 */
export async function fetchSessionById(
  sessionId: string
): Promise<SessionWithDetails | null> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      session_type:session_types(*),
      trainer:profiles!sessions_trainer_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  // Get availability
  const { data: availabilityData } = await supabase.rpc(
    'get_session_availability',
    { p_session_id: sessionId }
  )
  const availability: SessionAvailability = availabilityData?.[0] || {
    capacity: session.capacity || 1,
    booked_count: 0,
    spots_left: session.capacity || 1,
    is_full: false,
  }

  // Check if current user has a booking
  let user_booking = null
  if (userId) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('session_id', sessionId)
      .eq('client_id', userId)
      .eq('status', 'confirmed')
      .maybeSingle()
    user_booking = bookingData
  }

  // Handle Supabase FK join format
  const session_type = Array.isArray(session.session_type)
    ? session.session_type[0] || null
    : session.session_type
  const trainer = Array.isArray(session.trainer)
    ? session.trainer[0] || null
    : session.trainer

  return {
    ...session,
    session_type,
    trainer,
    availability,
    user_booking,
  } as SessionWithDetails
}

/**
 * Create a new session (trainer only)
 */
export async function createSession(input: CreateSessionInput): Promise<Session> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      trainer_id: input.trainer_id,
      session_type_id: input.session_type_id || null,
      title: input.title,
      description: input.description || null,
      duration_minutes: input.duration_minutes || 60,
      capacity: input.capacity ?? 1,
      is_premium: input.is_premium || false,
      location: input.location || null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      status: 'scheduled',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update a session (trainer only)
 */
export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput
): Promise<Session> {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {}
  if (input.session_type_id !== undefined) updateData.session_type_id = input.session_type_id
  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.duration_minutes !== undefined) updateData.duration_minutes = input.duration_minutes
  if (input.capacity !== undefined) updateData.capacity = input.capacity
  if (input.is_premium !== undefined) updateData.is_premium = input.is_premium
  if (input.location !== undefined) updateData.location = input.location
  if (input.starts_at !== undefined) updateData.starts_at = input.starts_at
  if (input.ends_at !== undefined) updateData.ends_at = input.ends_at
  if (input.status !== undefined) updateData.status = input.status
  if (input.cancellation_reason !== undefined) updateData.cancellation_reason = input.cancellation_reason

  // If cancelling, set cancelled_at
  if (input.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Cancel a session (trainer only)
 */
export async function cancelSession(
  sessionId: string,
  reason?: string
): Promise<Session> {
  return updateSession(sessionId, {
    status: 'cancelled',
    cancellation_reason: reason || null,
  })
}

/**
 * Delete a session (trainer only)
 * Note: Use cancelSession instead in most cases to preserve history
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

/**
 * Fetch sessions for a trainer (for admin/management views)
 */
export async function fetchTrainerSessions(
  trainerId: string,
  filters: SessionFilters = {}
): Promise<SessionWithDetails[]> {
  return fetchSessions({
    ...filters,
    trainer_id: trainerId,
  })
}

/**
 * Get session availability (wrapper for RPC function)
 */
export async function getSessionAvailability(
  sessionId: string
): Promise<SessionAvailability> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_session_availability', {
    p_session_id: sessionId,
  })

  if (error) throw error
  return data?.[0] || {
    capacity: 1,
    booked_count: 0,
    spots_left: 1,
    is_full: false,
  }
}
