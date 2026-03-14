import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { uploadLogo, updateSettings } from '@/modules/admin/services/settings'
import { getR2FilePublicUrl } from '@/modules/messaging/services/storage'

const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return createApiError('No file provided', 400, 'VALIDATION_ERROR')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return createApiError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG', 400, 'VALIDATION_ERROR')
    }

    if (file.size > MAX_LOGO_SIZE) {
      return createApiError('File too large. Maximum 5MB', 400, 'VALIDATION_ERROR')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'png'
    const key = `facility/logo-${Date.now()}.${ext}`

    await uploadLogo(key, buffer, file.type)
    const logoUrl = getR2FilePublicUrl(key)

    // Update settings with the new logo URL
    await updateSettings(db, { logo_url: logoUrl })

    return NextResponse.json({ success: true, data: { logo_url: logoUrl } })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-settings-logo-upload')
  }
}
