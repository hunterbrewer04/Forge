/**
 * Server-Side File Upload Validation API
 *
 * Security Features:
 * - Validates file types using magic bytes (not just MIME type)
 * - Enforces file size limits server-side
 * - Requires authentication
 * - Verifies user has access to the conversation
 * - Uses rate limiting to prevent abuse
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { uploadToR2 } from '@/modules/messaging'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq, and, or } from 'drizzle-orm'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError } from '@/lib/api/errors'
import { isValidUUID } from '@/lib/api/validation'

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime']
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]

/**
 * Validates file type using magic bytes
 */
function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer)

  // For images, check magic bytes
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (mimeType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }

  if (mimeType === 'image/gif') {
    return (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    )
  }

  if (mimeType === 'image/webp') {
    // WebP files start with RIFF....WEBP
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }

  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    // MP4/MOV files have "ftyp" at offset 4
    return (
      bytes[4] === 0x66 && // 'f'
      bytes[5] === 0x74 && // 't'
      bytes[6] === 0x79 && // 'y'
      bytes[7] === 0x70    // 'p'
    )
  }

  return false
}

/**
 * POST /api/upload
 *
 * Validates and uploads a file to R2
 *
 * Request: multipart/form-data with:
 * - file: The file to upload
 * - conversationId: The conversation to upload to
 *
 * Response: { filePath: string, mediaType: 'image' | 'video' }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const { profileId } = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.UPLOAD,
      profileId
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const conversationId = formData.get('conversationId') as string | null

    if (!file) {
      return createApiError('No file provided', 400, 'NO_FILE')
    }

    if (!conversationId) {
      return createApiError('No conversation ID provided', 400, 'NO_CONVERSATION_ID')
    }

    // Validate conversationId is a UUID to prevent path traversal
    if (!isValidUUID(conversationId)) {
      return createApiError('Invalid conversation ID format', 400, 'INVALID_CONVERSATION_ID')
    }

    // 4. Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return createApiError(
        'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV',
        400,
        'INVALID_FILE_TYPE'
      )
    }

    // 5. Validate file size
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      return createApiError(
        `File too large. Maximum size is ${maxSizeMB}MB`,
        400,
        'FILE_TOO_LARGE'
      )
    }

    // 6. Validate magic bytes (server-side file type verification)
    const buffer = await file.arrayBuffer()
    if (!validateMagicBytes(buffer, file.type)) {
      return createApiError(
        'File content does not match declared type',
        400,
        'INVALID_FILE_CONTENT'
      )
    }

    // 7. Verify conversation access via Drizzle
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.clientId, profileId),
          eq(conversations.trainerId, profileId)
        )
      ),
      columns: { id: true },
    })

    if (!conversation) {
      return createApiError(
        'Conversation not found or access denied',
        403,
        'CONVERSATION_ACCESS_DENIED'
      )
    }

    // 8. Generate unique filename and upload to R2
    const timestamp = Date.now()
    const randomString = crypto.randomUUID().slice(0, 8)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${timestamp}_${randomString}.${extension}`
    const filePath = `${conversationId}/${fileName}`

    const r2Key = `chat-media/${filePath}`
    try {
      await uploadToR2(r2Key, buffer, file.type)
    } catch (uploadError) {
      console.error('R2 upload error:', uploadError)
      return createApiError(
        'Failed to upload file',
        500,
        'UPLOAD_FAILED'
      )
    }

    // 9. Return success response
    const mediaType = isImage ? 'image' : 'video'

    return NextResponse.json({
      success: true,
      filePath: r2Key,
      mediaType,
    })
  } catch (error) {
    console.error('Unexpected upload error:', error)
    return createApiError(
      'Internal server error during upload',
      500,
      'UPLOAD_INTERNAL_ERROR'
    )
  }
}
