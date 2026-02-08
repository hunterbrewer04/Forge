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
import { createServerClient } from '@supabase/ssr'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError } from '@/lib/api/errors'
import { isValidUUID } from '@/lib/api/validation'
import { env } from '@/lib/env-validation'

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

// Magic bytes for file type validation
// These are the first bytes of each file format
const MAGIC_BYTES: Record<string, { bytes: number[]; mask?: number[] }[]> = {
  // Images
  'image/jpeg': [{ bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF87a or GIF89a
  'image/webp': [
    { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header (WebP starts with RIFF)
  ],
  // Videos
  'video/mp4': [
    { bytes: [0x00, 0x00, 0x00] }, // ftyp box (variable 4th byte)
    { bytes: [0x66, 0x74, 0x79, 0x70] }, // "ftyp" at offset 4
  ],
  'video/quicktime': [
    { bytes: [0x00, 0x00, 0x00] }, // Similar to MP4
  ],
}

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
 * Validates and uploads a file to Supabase Storage
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
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.UPLOAD,
      user.id
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

    // 7. Create Supabase client and verify conversation access
    const supabase = createServerClient(
      env.supabaseUrl(),
      env.supabaseAnonKey(),
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .or(`client_id.eq.${user.id},trainer_id.eq.${user.id}`)
      .single()

    if (convError || !conversation) {
      return createApiError(
        'Conversation not found or access denied',
        403,
        'CONVERSATION_ACCESS_DENIED'
      )
    }

    // 8. Generate unique filename and upload
    const timestamp = Date.now()
    const randomString = crypto.randomUUID().slice(0, 8)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `${timestamp}_${randomString}.${extension}`
    const filePath = `${conversationId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
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
      filePath,
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
