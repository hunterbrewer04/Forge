import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError } from '@/lib/api/errors'
import { generateR2SignedUrl } from '@/modules/messaging'
import { db } from '@/lib/db'
import { conversations } from '@/lib/db/schema'
import { eq, and, or } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, profileId)
    if (rateLimitResult) return rateLimitResult

    const filePath = request.nextUrl.searchParams.get('path')
    if (!filePath) {
      return createApiError('Missing path parameter', 400, 'MISSING_PATH')
    }

    // Security: reject path traversal
    if (filePath.includes('..') || filePath.includes('//')) {
      return createApiError('Invalid file path', 400, 'INVALID_PATH')
    }

    // Security: validate path prefix
    if (!filePath.startsWith('chat-media/') && !filePath.startsWith('avatars/')) {
      return createApiError('Invalid file path', 400, 'INVALID_PATH')
    }

    // Security: for chat-media, verify user is a conversation participant
    if (filePath.startsWith('chat-media/')) {
      const parts = filePath.split('/')
      if (parts.length < 3) {
        return createApiError('Invalid file path', 400, 'INVALID_PATH')
      }
      const conversationId = parts[1]

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
        return createApiError('Access denied', 403, 'ACCESS_DENIED')
      }
    }

    const signedUrl = await generateR2SignedUrl(filePath)
    return NextResponse.json({ signed_url: signedUrl })
  } catch (error) {
    console.error('Signed URL error:', error)
    return createApiError('Failed to generate signed URL', 500, 'SIGNED_URL_ERROR')
  }
}
