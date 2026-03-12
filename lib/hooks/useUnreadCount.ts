'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Ably from 'ably'
import { getAblyClient } from '@/lib/ably-browser'
import { logger } from '@/lib/utils/logger'

interface UseUnreadCountOptions {
  userId: string | undefined
  isTrainer?: boolean
  isClient?: boolean
}

interface UnreadCountResult {
  unreadCount: number
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch unread message count for a user.
 *
 * Since the database may not have an is_read column yet, this implementation
 * counts messages in the user's conversations where they are not the sender.
 * This provides a "messages from others" count which can be used as a notification badge.
 *
 * When is_read is added to the schema, this hook can be updated to use:
 * .eq('is_read', false)
 */
export function useUnreadCount({ userId, isTrainer, isClient }: UseUnreadCountOptions): UnreadCountResult {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const conversationIdsRef = useRef<string[]>([])

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Determine role for the conversations API
      const role = isTrainer ? 'trainer' : isClient ? 'client' : null

      if (!role) {
        setUnreadCount(0)
        setLoading(false)
        return
      }

      const res = await fetch(`/api/conversations?role=${role}`)
      if (!res.ok) throw new Error('Failed to fetch conversations')

      const json = await res.json()

      // Collect conversation IDs for the Realtime subscription filter
      let conversationIds: string[] = []
      let totalUnread = 0

      if (role === 'trainer') {
        const convs: { id: string; unread_count: number }[] = json.conversations || []
        conversationIds = convs.map(c => c.id)
        totalUnread = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
      } else {
        const conv: { id: string; unread_count: number } | null = json.conversation ?? null
        if (conv) {
          conversationIds = [conv.id]
          totalUnread = conv.unread_count || 0
        }
      }

      // Store conversation IDs in ref for real-time subscription filtering
      conversationIdsRef.current = conversationIds

      // Cap at 99 for display purposes
      setUnreadCount(Math.min(totalUnread, 99))
    } catch (err) {
      logger.error('Error fetching unread count:', err)
      setError('Failed to fetch unread count')
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [userId, isTrainer, isClient])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!userId) return

    let channel: Ably.RealtimeChannel | null = null

    try {
      const ably = getAblyClient()
      channel = ably.channels.get('unread-messages')

      const handleNewMessage = (message: Ably.Message) => {
        const payload = message.data as { conversation_id: string; sender_id: string }
        // If the new message is not from the current user and belongs to user's conversations, increment count
        if (
          payload.sender_id !== userId &&
          conversationIdsRef.current.includes(payload.conversation_id)
        ) {
          setUnreadCount(prev => Math.min(prev + 1, 99))
        }
      }

      channel.subscribe('new-message', handleNewMessage)
    } catch (err) {
      logger.error('Failed to set up Ably subscription for unread count:', err)
    }

    return () => {
      try {
        if (channel) {
          channel.unsubscribe()
          getAblyClient().channels.release('unread-messages')
        }
      } catch {
        // Ignore cleanup errors — client may already be closed
      }
    }
  }, [userId])

  return {
    unreadCount,
    loading,
    error,
    refresh: fetchUnreadCount,
  }
}
