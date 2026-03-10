/**
 * Session availability query helpers
 *
 * getSessionAvailability       — single session capacity + booked count
 * getSessionsAvailabilityBatch — multi-session version for list views
 */

import { db } from '@/lib/db'
import { sessions, bookings } from '@/lib/db/schema'
import { eq, and, inArray, count } from 'drizzle-orm'

export interface SessionAvailability {
  capacity: number
  booked_count: number
  spots_left: number
  is_full: boolean
}

export async function getSessionAvailability(
  sessionId: string
): Promise<SessionAvailability | null> {
  const result = await db
    .select({
      capacity: sessions.capacity,
      bookedCount: count(bookings.id),
    })
    .from(sessions)
    .leftJoin(
      bookings,
      and(
        eq(bookings.sessionId, sessions.id),
        eq(bookings.status, 'confirmed')
      )
    )
    .where(eq(sessions.id, sessionId))
    .groupBy(sessions.id, sessions.capacity)

  if (!result[0]) return null

  const { capacity, bookedCount } = result[0]
  const cap = capacity ?? 0
  return {
    capacity: cap,
    booked_count: bookedCount,
    spots_left: Math.max(0, cap - bookedCount),
    is_full: bookedCount >= cap,
  }
}

export async function getSessionsAvailabilityBatch(
  sessionIds: string[]
): Promise<Map<string, SessionAvailability>> {
  if (sessionIds.length === 0) return new Map()

  const results = await db
    .select({
      sessionId: sessions.id,
      capacity: sessions.capacity,
      bookedCount: count(bookings.id),
    })
    .from(sessions)
    .leftJoin(
      bookings,
      and(
        eq(bookings.sessionId, sessions.id),
        eq(bookings.status, 'confirmed')
      )
    )
    .where(inArray(sessions.id, sessionIds))
    .groupBy(sessions.id, sessions.capacity)

  const map = new Map<string, SessionAvailability>()
  for (const r of results) {
    const cap = r.capacity ?? 0
    map.set(r.sessionId, {
      capacity: cap,
      booked_count: r.bookedCount,
      spots_left: Math.max(0, cap - r.bookedCount),
      is_full: r.bookedCount >= cap,
    })
  }
  return map
}
