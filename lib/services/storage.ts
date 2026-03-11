import { logger } from '@/lib/utils/logger'

const CACHE_TTL_MS = 45 * 60 * 1000 // 45 minutes (refresh before 1-hour expiry)

// In-memory cache for signed URLs to avoid redundant API calls
const MAX_CACHE_SIZE = 500
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Generate a signed URL for secure media access with caching.
 * Cached URLs are reused until 45 minutes (refreshed before 1-hour expiry).
 */
export async function getSignedMediaUrl(filePath: string): Promise<string | null> {
  const cached = signedUrlCache.get(filePath)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url
  }

  try {
    const res = await fetch(`/api/media/signed-url?path=${encodeURIComponent(filePath)}`)
    if (!res.ok) {
      logger.error('Error generating signed URL:', res.status)
      return null
    }

    const data = await res.json()
    const signedUrl = data.signed_url

    if (!signedUrl) {
      logger.error('No signed URL returned from API')
      return null
    }

    const now = Date.now()

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
      url: signedUrl,
      expiresAt: now + CACHE_TTL_MS,
    })

    return signedUrl
  } catch (err) {
    logger.error('Unexpected error generating signed URL:', err)
    return null
  }
}

/**
 * Process a message to add signed URL for media
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
