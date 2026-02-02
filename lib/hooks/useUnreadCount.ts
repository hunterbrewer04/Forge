'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
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
      const supabase = createClient()

      // First, get the user's conversation IDs
      let conversationIds: string[] = []

      if (isTrainer) {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('trainer_id', userId)

        if (convError) throw convError
        conversationIds = conversations?.map(c => c.id) || []
      } else if (isClient) {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('client_id', userId)

        if (convError) throw convError
        conversationIds = conversations?.map(c => c.id) || []
      }

      // Store conversation IDs in ref for real-time subscription filtering
      conversationIdsRef.current = conversationIds

      if (conversationIds.length === 0) {
        setUnreadCount(0)
        setLoading(false)
        return
      }

      // Count messages in these conversations where user is not the sender
      // and message was created in the last 7 days (to limit the count)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (countError) throw countError

      // Cap at 99 for display purposes
      setUnreadCount(Math.min(count || 0, 99))
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

    const supabase = createClient()

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          // If the new message is not from the current user and belongs to user's conversations, increment count
          if (
            payload.new.sender_id !== userId &&
            conversationIdsRef.current.includes(payload.new.conversation_id)
          ) {
            setUnreadCount(prev => Math.min(prev + 1, 99))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return {
    unreadCount,
    loading,
    error,
    refresh: fetchUnreadCount,
  }
}
