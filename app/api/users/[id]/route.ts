/**
 * User Public Profile API Route
 *
 * GET /api/users/[id]
 *   Returns a limited public profile for another user by their profile UUID.
 *   The requester must be authenticated. Only fields that are safe to share
 *   between conversation participants are returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Rate limit
    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Fetch the target user's public profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
      columns: {
        id: true,
        fullName: true,
        avatarUrl: true,
        username: true,
        email: true,
        isTrainer: true,
        hasFullAccess: true,
        createdAt: true,
      },
    })

    if (!profile) {
      return createApiError('User not found', 404, 'RESOURCE_NOT_FOUND')
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        full_name: profile.fullName,
        avatar_url: profile.avatarUrl,
        username: profile.username,
        email: profile.email,
        is_trainer: profile.isTrainer,
        has_full_access: profile.hasFullAccess,
        created_at: profile.createdAt,
      },
    })
  } catch (error) {
    return handleUnexpectedError(error, 'user-profile-get')
  }
}
