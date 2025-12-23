import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'

const SIGNED_URL_EXPIRY = 3600 // 1 hour

/**
 * Generate a signed URL for secure media access
 * Returns null if URL generation fails
 */
export async function getSignedMediaUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY)

    if (error) {
      logger.error('Error generating signed URL:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    logger.error('Unexpected error generating signed URL:', err)
    return null
  }
}

/**
 * Upload media to Supabase storage
 * Returns the file path and media type, or null on failure
 */
export async function uploadMedia(
  file: File,
  conversationId: string
): Promise<{ path: string; type: 'image' | 'video' } | null> {
  const supabase = createClient()

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop()
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

  const mediaType = file.type.startsWith('image/') ? 'image' : 'video'
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
