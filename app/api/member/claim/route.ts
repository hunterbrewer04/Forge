// app/api/member/claim/route.ts
import { NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function POST() {
  try {
    const auth = await validateAuth()
    if (auth instanceof NextResponse) return auth
    const { profileId } = auth

    try {
      await db.update(profiles).set({ isMember: true }).where(eq(profiles.id, profileId))
    } catch (dbErr) {
      console.error('Error setting is_member:', dbErr)
      return createApiError('Failed to activate member profile', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'member-claim')
  }
}
