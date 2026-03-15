/**
 * Booking service
 *
 * bookSession — atomic transaction that enforces capacity and duplicate checks
 * cancelSessionBookings — bulk-cancel all confirmed bookings for a session
 */

import { sessions, bookings } from '@/lib/db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'
import type { DrizzleInstance } from '../config'

export async function bookSession(db: DrizzleInstance, sessionId: string, clientId: string) {
  return await db.transaction(async (tx) => {
    // Lock the session row to prevent concurrent over-booking
    const [session] = await tx
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .for('update')

    if (!session || session.status !== 'scheduled') {
      throw new Error('Session not available')
    }

    // Count confirmed bookings within the transaction
    const [{ value: bookedCount }] = await tx
      .select({ value: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.sessionId, sessionId),
          eq(bookings.status, 'confirmed')
        )
      )

    if (session.capacity !== null && bookedCount >= session.capacity) {
      throw new Error('Session is full')
    }

    // Prevent duplicate booking
    const existing = await tx.query.bookings.findFirst({
      where: and(
        eq(bookings.sessionId, sessionId),
        eq(bookings.clientId, clientId),
        eq(bookings.status, 'confirmed')
      ),
    })

    if (existing) {
      throw new Error('Already booked')
    }

    // Insert the booking
    const [booking] = await tx
      .insert(bookings)
      .values({
        sessionId,
        clientId,
        status: 'confirmed',
        bookedAt: new Date(),
      })
      .returning()

    return booking
  })
}

/**
 * Bulk-cancel all confirmed bookings for a session.
 *
 * Intended to be called after a session is cancelled so that every
 * booked client's record is updated atomically.
 *
 * @returns Array of client IDs whose bookings were cancelled
 */
export async function cancelSessionBookings(
  db: DrizzleInstance,
  sessionId: string,
  reason: string
): Promise<string[]> {
  // 1. Find all confirmed bookings for the session
  const confirmedBookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.sessionId, sessionId),
      eq(bookings.status, 'confirmed')
    ),
    columns: { id: true, clientId: true },
  })

  if (confirmedBookings.length === 0) {
    return []
  }

  const now = new Date()
  const bookingIds = confirmedBookings.map((b) => b.id)

  // 2. Batch-update all confirmed bookings to cancelled in a single query
  await db
    .update(bookings)
    .set({
      status: 'cancelled',
      cancelledAt: now,
      cancellationReason: reason,
      updatedAt: now,
    })
    .where(inArray(bookings.id, bookingIds))

  // 3. Return affected client IDs
  return confirmedBookings.map((b) => b.clientId)
}
