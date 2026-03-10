/**
 * Client-side service for sessions.
 * Thin fetch wrappers around /api/sessions — no direct Supabase access.
 * Do not re-add supabase-browser import.
 */

import type {
  Session,
  SessionType,
  SessionWithDetails,
  SessionAvailability,
  CreateSessionInput,
  UpdateSessionInput,
  SessionFilters,
} from '@/lib/types/sessions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSessionParams(filters: SessionFilters, extra?: Record<string, string>): string {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.type) params.set('type', filters.type)
  if (filters.trainer_id) params.set('trainer_id', filters.trainer_id)
  if (filters.include_full === false) params.set('include_full', 'false')
  if (filters.status) params.set('status', filters.status)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, v)
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

/**
 * Fetch all session types.
 */
export async function fetchSessionTypes(): Promise<SessionType[]> {
  const res = await fetch('/api/sessions?types_only=true')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch session types')
  }
  const json = await res.json()
  return json.session_types ?? []
}

/**
 * Fetch a single session type by slug.
 * Fetches the full list and filters client-side (no dedicated endpoint).
 */
export async function fetchSessionTypeBySlug(slug: string): Promise<SessionType | null> {
  const types = await fetchSessionTypes()
  return types.find((t) => t.slug === slug) ?? null
}

// ---------------------------------------------------------------------------
// Sessions list / detail
// ---------------------------------------------------------------------------

/**
 * Fetch sessions with optional filters.
 *
 * @param _userId - Unused (auth context resolved server-side; user_booking
 *                  is always included from the server for the current user)
 */
export async function fetchSessions(
  filters: SessionFilters = {},
  _userId?: string
): Promise<SessionWithDetails[]> {
  const qs = buildSessionParams(filters)
  const res = await fetch(`/api/sessions${qs}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch sessions')
  }
  const json = await res.json()
  return json.sessions ?? []
}

/**
 * Fetch a single session by ID with full details.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function fetchSessionById(
  sessionId: string,
  _userId?: string
): Promise<SessionWithDetails | null> {
  const res = await fetch(`/api/sessions/${sessionId}`)

  if (res.status === 404) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch session')
  }

  const json = await res.json()
  // GET /api/sessions/[id] returns { session: { ...formatSession, availability, user_booking } }
  return json.session ?? null
}

// ---------------------------------------------------------------------------
// Session mutations (trainer only)
// ---------------------------------------------------------------------------

/**
 * Create a new session.
 */
export async function createSession(input: CreateSessionInput): Promise<Session> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to create session')
  }

  const json = await res.json()
  return json.data
}

/**
 * Update a session.
 */
export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput
): Promise<Session> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to update session')
  }

  const json = await res.json()
  return json.data
}

/**
 * Cancel a session (sets status to 'cancelled').
 */
export async function cancelSession(
  sessionId: string,
  reason?: string
): Promise<Session> {
  return updateSession(sessionId, {
    status: 'cancelled',
    cancellation_reason: reason ?? null,
  })
}

/**
 * Delete a session.
 * Prefer cancelSession to preserve history.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to delete session')
  }
}

// ---------------------------------------------------------------------------
// Trainer-specific helpers
// ---------------------------------------------------------------------------

/**
 * Fetch sessions for a specific trainer.
 *
 * @param _userId - Unused (auth context resolved server-side)
 */
export async function fetchTrainerSessions(
  trainerId: string,
  filters: SessionFilters = {},
  _userId?: string
): Promise<SessionWithDetails[]> {
  return fetchSessions({ ...filters, trainer_id: trainerId })
}

/**
 * Get availability for a single session.
 */
export async function getSessionAvailability(
  sessionId: string
): Promise<SessionAvailability> {
  const res = await fetch(`/api/sessions/${sessionId}`)

  if (!res.ok) {
    // Fall back to a safe default if the request fails
    return { capacity: 1, booked_count: 0, spots_left: 1, is_full: false }
  }

  const json = await res.json()
  return (
    json.session?.availability ?? {
      capacity: 1,
      booked_count: 0,
      spots_left: 1,
      is_full: false,
    }
  )
}
