import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

function formatProfile(p: {
  id: string
  fullName: string | null
  avatarUrl: string | null
  username: string | null
  isTrainer: boolean
  isAdmin: boolean
  hasFullAccess: boolean
  isMember: boolean
  membershipStatus: string | null
  createdAt: Date
}) {
  return {
    id: p.id,
    full_name: p.fullName,
    avatar_url: p.avatarUrl,
    username: p.username,
    is_trainer: p.isTrainer,
    is_admin: p.isAdmin,
    has_full_access: p.hasFullAccess,
    is_member: p.isMember,
    membership_status: p.membershipStatus,
    created_at: p.createdAt,
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return createApiError('Unauthorized', 401, 'NO_SESSION')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.clerkUserId, userId),
      columns: {
        id: true,
        fullName: true,
        avatarUrl: true,
        username: true,
        isTrainer: true,
        isAdmin: true,
        hasFullAccess: true,
        isMember: true,
        membershipStatus: true,
        createdAt: true,
      },
    })

    if (!profile) {
      return createApiError('Profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    return NextResponse.json({ profile: formatProfile(profile) })
  } catch (err) {
    return handleUnexpectedError(err, 'profile-get')
  }
}

/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile fields.
 * Accepts any subset of: { full_name, username, avatar_url }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return createApiError('Unauthorized', 401, 'NO_SESSION')
    }

    let body: { full_name?: string; username?: string | null; avatar_url?: string | null }
    try {
      body = await request.json()
    } catch {
      return createApiError('Invalid JSON body', 400, 'INVALID_REQUEST')
    }

    // Build the update payload — only include fields that were explicitly provided
    const updateData: {
      fullName?: string
      username?: string | null
      avatarUrl?: string | null
      updatedAt: Date
    } = { updatedAt: new Date() }

    if (body.full_name !== undefined) {
      const trimmed = body.full_name.trim()
      if (!trimmed) {
        return createApiError('full_name cannot be empty', 400, 'VALIDATION_ERROR')
      }
      updateData.fullName = trimmed
    }

    if (body.username !== undefined) {
      if (body.username !== null) {
        const u = body.username.toLowerCase().trim()
        if (u.length < 3 || u.length > 20 || !/^[a-zA-Z0-9_]+$/.test(u)) {
          return createApiError(
            'username must be 3–20 characters and contain only letters, numbers, and underscores',
            400,
            'VALIDATION_ERROR'
          )
        }
        updateData.username = u
      } else {
        updateData.username = null
      }
    }

    if (body.avatar_url !== undefined) {
      updateData.avatarUrl = body.avatar_url
    }

    const [updated] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.clerkUserId, userId))
      .returning({
        id: profiles.id,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        username: profiles.username,
        isTrainer: profiles.isTrainer,
        isAdmin: profiles.isAdmin,
        hasFullAccess: profiles.hasFullAccess,
        isMember: profiles.isMember,
        membershipStatus: profiles.membershipStatus,
        createdAt: profiles.createdAt,
      })

    if (!updated) {
      return createApiError('Profile not found', 404, 'PROFILE_NOT_FOUND')
    }

    return NextResponse.json({ profile: formatProfile(updated) })
  } catch (err) {
    return handleUnexpectedError(err, 'profile-patch')
  }
}
