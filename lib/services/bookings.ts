/**
 * Client-side service for bookings.
 * Thin fetch wrappers around /api/bookings and /api/sessions/:id/book.
 * No direct Supabase access — do not re-add supabase-browser import.
 */

import type {
  Booking,
  BookingWithSession,
  BookSessionResult,
  BookingFilters,
  CancelBookingInput,
} from '@/lib/types/sessions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBookingParams(filters: BookingFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.upcoming === false) params.set('upcoming', 'false')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ---------------------------------------------------------------------------
// Booking operations
// ---------------------------------------------------------------------------

/**
 * Book a session for the authenticated user.
 * Uses the API route which performs atomic capacity enforcement.
 */
export async function bookSession(
  sessionId: string,
  _clientId: string
): Promise<BookSessionResult> {
  const res = await fetch(`/api/sessions/${sessionId}/book`, {
    method: 'POST',
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    return {
      success: false,
      booking_id: null,
      error_message: json?.error ?? 'Failed to book session',
    }
  }

  return {
    success: true,
    booking_id: json?.data?.id ?? null,
    error_message: null,
  }
}

/**
 * Cancel a booking.
 */
export async function cancelBooking(
  bookingId: string,
  input?: CancelBookingInput
): Promise<Booking> {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'cancelled',
      cancellation_reason: input?.cancellation_reason ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to cancel booking')
  }

  const json = await res.json()
  return json.data
}

/**
 * Fetch a single booking by ID with full session details.
 */
export async function fetchBookingById(
  bookingId: string
): Promise<BookingWithSession | null> {
  const res = await fetch(`/api/bookings/${bookingId}`)

  if (res.status === 404) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch booking')
  }

  const json = await res.json()
  return json.data ?? null
}

/**
 * Fetch bookings for the current user with optional filters.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function fetchUserBookings(
  _userId: string,
  filters: BookingFilters = {}
): Promise<BookingWithSession[]> {
  const qs = buildBookingParams(filters)
  const res = await fetch(`/api/bookings${qs}`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch bookings')
  }

  const json = await res.json()
  return json.data ?? []
}

/**
 * Fetch all bookings for a specific session (trainer view).
 */
export async function fetchSessionBookings(
  sessionId: string
): Promise<Booking[]> {
  const res = await fetch(`/api/sessions/${sessionId}/bookings`)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch session bookings')
  }

  const json = await res.json()
  return json.bookings ?? []
}

/**
 * Check whether the authenticated user has an active booking for a session.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function hasUserBookedSession(
  sessionId: string,
  _userId: string
): Promise<boolean> {
  // Re-uses the GET session detail endpoint which includes user_booking
  const res = await fetch(`/api/sessions/${sessionId}`)
  if (!res.ok) return false

  const json = await res.json()
  return !!json?.data?.user_booking
}

/**
 * Get the authenticated user's booking record for a specific session,
 * or null if they haven't booked it.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function getUserBookingForSession(
  sessionId: string,
  _userId: string
): Promise<Booking | null> {
  const res = await fetch(`/api/sessions/${sessionId}`)
  if (!res.ok) return null

  const json = await res.json()
  const userBooking = json?.data?.user_booking
  return userBooking ?? null
}

/**
 * Mark a booking as attended (trainer only).
 */
export async function markBookingAttended(bookingId: string): Promise<Booking> {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'attended' }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to mark booking as attended')
  }

  const json = await res.json()
  return json.data
}

/**
 * Mark a booking as no-show (trainer only).
 */
export async function markBookingNoShow(bookingId: string): Promise<Booking> {
  const res = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'no_show' }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to mark booking as no-show')
  }

  const json = await res.json()
  return json.data
}

/**
 * Get the count of confirmed bookings for the authenticated user.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function getUserBookingCount(_userId: string): Promise<number> {
  const res = await fetch('/api/bookings?count_only=true')

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch booking count')
  }

  const json = await res.json()
  return typeof json.count === 'number' ? json.count : 0
}
