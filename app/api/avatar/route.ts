import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError } from '@/lib/api/errors'
import { validateMagicBytes, MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES } from '@/lib/api/file-validation'
import { uploadToR2, deleteFromR2, getR2FilePublicUrl } from '@/modules/messaging'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.UPLOAD, profileId)
    if (rateLimitResult) return rateLimitResult

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return createApiError('No file provided', 400, 'NO_FILE')
    }

    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return createApiError(
        'Invalid file type. Allowed: JPEG, PNG, GIF, WebP',
        400,
        'INVALID_FILE_TYPE'
      )
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      return createApiError('File too large. Maximum size is 5MB', 400, 'FILE_TOO_LARGE')
    }

    // Validate file extension
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : null
    if (!fileExt) {
      return createApiError('Invalid file extension', 400, 'INVALID_EXTENSION')
    }

    // Validate magic bytes
    const buffer = await file.arrayBuffer()
    if (!validateMagicBytes(buffer, file.type)) {
      return createApiError(
        'File content does not match declared type',
        400,
        'INVALID_FILE_CONTENT'
      )
    }

    // Get current profile to find old avatar
    const currentProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { avatarUrl: true },
    })

    // Upload to R2
    const timestamp = Date.now()
    const key = `avatars/${profileId}-${timestamp}.${fileExt}`
    await uploadToR2(key, buffer, file.type)

    const publicUrl = getR2FilePublicUrl(key)

    // Update profile avatar_url
    await db
      .update(profiles)
      .set({ avatarUrl: publicUrl, updatedAt: new Date() })
      .where(eq(profiles.id, profileId))

    // Best-effort delete old avatar from R2
    if (currentProfile?.avatarUrl) {
      try {
        // Only delete if it's an R2 URL (not an old Supabase URL)
        const r2PublicUrl = process.env.R2_PUBLIC_URL
        if (r2PublicUrl && currentProfile.avatarUrl.startsWith(r2PublicUrl)) {
          const oldKey = currentProfile.avatarUrl.replace(`${r2PublicUrl}/`, '')
          await deleteFromR2(oldKey)
        }
      } catch {
        // Best-effort — old avatar cleanup failure is not critical
      }
    }

    return NextResponse.json({ success: true, avatar_url: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return createApiError('Failed to upload avatar', 500, 'AVATAR_UPLOAD_ERROR')
  }
}
