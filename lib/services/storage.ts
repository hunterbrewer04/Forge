import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'

const SIGNED_URL_EXPIRY = 3600 // 1 hour
const CACHE_BUFFER = 300 // 5 minutes before expiry, refresh

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

// In-memory cache for signed URLs to avoid redundant API calls
const MAX_CACHE_SIZE = 500
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Generate a signed URL for secure media access with caching.
 * Cached URLs are reused until 5 minutes before expiry.
 */
export async function getSignedMediaUrl(filePath: string): Promise<string | null> {
  const now = Date.now()
  const cached = signedUrlCache.get(filePath)

  if (cached && cached.expiresAt > now + CACHE_BUFFER * 1000) {
    return cached.url
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY)

    if (error) {
      logger.error('Error generating signed URL:', error)
      return null
    }

    // Enforce max cache size before inserting
    if (signedUrlCache.size >= MAX_CACHE_SIZE) {
      // First pass: remove expired entries
      for (const [key, entry] of signedUrlCache) {
        if (entry.expiresAt <= now) signedUrlCache.delete(key)
      }
      // If still over limit, remove oldest entries
      if (signedUrlCache.size >= MAX_CACHE_SIZE) {
        const entries = [...signedUrlCache.entries()]
          .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE + 1)
        for (const [key] of toRemove) signedUrlCache.delete(key)
      }
    }

    signedUrlCache.set(filePath, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_URL_EXPIRY * 1000,
    })

    return data.signedUrl
  } catch (err) {
    logger.error('Unexpected error generating signed URL:', err)
    return null
  }
}

/**
 * Upload media to Supabase storage with type and size validation.
 * Returns the file path and media type, or null on failure.
 */
export async function uploadMedia(
  file: File,
  conversationId: string
): Promise<{ path: string; type: 'image' | 'video' } | null> {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    logger.error('Upload rejected: invalid file type', file.type)
    return null
  }

  if (isImage && file.size > MAX_IMAGE_SIZE) {
    logger.error('Upload rejected: image too large', file.size)
    return null
  }

  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    logger.error('Upload rejected: video too large', file.size)
    return null
  }

  const supabase = createClient()

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `${timestamp}-${randomString}.${extension}`
  const filePath = `${conversationId}/${fileName}`

  const { error } = await supabase.storage
    .from('chat-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    logger.error('Upload error:', error)
    return null
  }

  const mediaType = isImage ? 'image' : 'video'
  return { path: filePath, type: mediaType }
}

/**
 * Process a message to add signed URL for media
 * Used to transform messages with media_url into displayable URLs
 */
export async function processMessageMedia<T extends { media_url: string | null; media_type: string | null }>(
  message: T
): Promise<T & { signedUrl?: string | null }> {
  if (message.media_url && message.media_type) {
    const signedUrl = await getSignedMediaUrl(message.media_url)
    return { ...message, signedUrl }
  }
  return message
}

/**
 * Process multiple messages to add signed URLs for media
 */
export async function processMessagesMedia<T extends { media_url: string | null; media_type: string | null }>(
  messages: T[]
): Promise<(T & { signedUrl?: string | null })[]> {
  return Promise.all(messages.map(msg => processMessageMedia(msg)))
}
