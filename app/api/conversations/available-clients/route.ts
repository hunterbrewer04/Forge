import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles, conversations } from '@/lib/db/schema'
import { eq, or, and, notInArray } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) return rateLimitResult

    // Get client IDs that already have a conversation with this trainer
    const existingConvs = await db
      .select({ clientId: conversations.clientId })
      .from(conversations)
      .where(eq(conversations.trainerId, profileId))

    const existingClientIds = existingConvs.map((c) => c.clientId)

    // Get all non-trainer profiles that don't already have a conversation
    const availableClients = await db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        email: profiles.email,
      })
      .from(profiles)
      .where(
        and(
          eq(profiles.isTrainer, false),
          or(eq(profiles.isMember, true), eq(profiles.hasFullAccess, true)),
          existingClientIds.length > 0
            ? notInArray(profiles.id, existingClientIds)
            : undefined
        )
      )

    return NextResponse.json({
      success: true,
      clients: availableClients.map((c) => ({
        id: c.id,
        full_name: c.fullName,
        avatar_url: c.avatarUrl,
        email: c.email,
      })),
    })
  } catch (error) {
    return handleUnexpectedError(error, 'available-clients')
  }
}
