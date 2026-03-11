/**
 * Booking service
 *
 * bookSession — atomic transaction that enforces capacity and duplicate checks
 */

import { sessions, bookings } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
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
