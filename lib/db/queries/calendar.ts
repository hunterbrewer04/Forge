import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrCreateCalendarToken(userId: string): Promise<string> {
  return await db.transaction(async (tx) => {
    const profile = await tx.query.profiles.findFirst({
      where: eq(profiles.id, userId),
      columns: { calendarToken: true },
    })

    if (!profile) throw new Error('Profile not found')

    if (profile.calendarToken) return profile.calendarToken

    const newToken = crypto.randomUUID()
    await tx.update(profiles).set({ calendarToken: newToken }).where(eq(profiles.id, userId))
    return newToken
  })
}

export async function regenerateCalendarToken(userId: string): Promise<string> {
  const newToken = crypto.randomUUID()
  const [updated] = await db
    .update(profiles)
    .set({ calendarToken: newToken })
    .where(eq(profiles.id, userId))
    .returning({ calendarToken: profiles.calendarToken })

  if (!updated) throw new Error('Profile not found')
  return updated.calendarToken!
}
