'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { fetchTrainerConversations } from '@/lib/services/conversations'
import { logger } from '@/lib/utils/logger'
import { ConversationListSkeleton } from '@/components/skeletons/ConversationSkeleton'
import MaterialIcon from '@/components/ui/MaterialIcon'

interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  client_name: string | null
  avatar_url?: string | null
  last_message?: string
  last_message_time?: string
  is_online?: boolean
  unread?: boolean
}

interface ConversationListProps {
  currentUserId: string
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  searchQuery?: string
}

export default function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  searchQuery = '',
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchTrainerConversations(currentUserId)

      const conversationsWithNames: Conversation[] = data.map((conv, idx) => ({
        id: conv.id,
        client_id: conv.client_id,
        trainer_id: conv.trainer_id,
        client_name: conv.profiles?.full_name || 'Unknown Client',
        avatar_url: conv.profiles?.avatar_url,
        last_message: 'Tap to view messages',
        last_message_time: idx === 0 ? '2m ago' : idx === 1 ? '1h ago' : 'Yesterday',
        is_online: idx < 2,
        unread: idx === 0,
      }))

      setConversations(conversationsWithNames)
    } catch (err) {
      logger.error('Error fetching conversations:', err)
      setError('Failed to load conversations. Tap to retry.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv =>
      conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [conversations, searchQuery])

  if (loading) {
    return <ConversationListSkeleton />
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary p-4">
        <button
          onClick={loadConversations}
          className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-bg-secondary rounded-2xl transition-colors group"
        >
          <div className="size-14 rounded-full bg-error/10 flex items-center justify-center mb-3 group-hover:bg-error/20 transition-colors">
            <MaterialIcon name="error" size={28} className="text-error" />
          </div>
          <div className="text-text-primary mb-2 text-sm font-medium">{error}</div>
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <MaterialIcon name="refresh" size={14} />
            Tap to retry
          </div>
        </button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-primary p-4">
        <div className="text-text-secondary text-sm text-center">
          No conversations yet
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-bg-primary overflow-y-auto">
      <div className="px-4 py-2">
        {filteredConversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            aria-label={`Conversation with ${conversation.client_name}`}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-bg-secondary active:scale-[0.98] ${
              selectedConversationId === conversation.id ? 'bg-primary/10' : ''
            }`}
          >
            {/* Avatar with online indicator */}
            <div className="relative shrink-0">
              <div className="size-12 rounded-full bg-bg-secondary overflow-hidden">
                {conversation.avatar_url ? (
                  <Image
                    src={conversation.avatar_url}
                    alt={conversation.client_name || 'Avatar'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <MaterialIcon name="person" size={24} className="text-text-muted" />
                  </div>
                )}
              </div>
              {conversation.is_online && (
                <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-bg-primary" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="font-semibold text-text-primary truncate">
                  {conversation.client_name}
                </h4>
                <span className={`text-xs ${conversation.unread ? 'text-primary font-semibold' : 'text-text-muted'}`}>
                  {conversation.last_message_time}
                </span>
              </div>
              <p className="text-sm text-text-secondary truncate">
                {conversation.last_message}
              </p>
            </div>

            {/* Unread indicator */}
            {conversation.unread && (
              <div className="size-2.5 rounded-full bg-primary shrink-0" />
            )}
          </button>
        ))}

        {filteredConversations.length === 0 && searchQuery && (
          <div className="py-8 text-center">
            <p className="text-text-secondary text-sm">No conversations matching &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* FAB for new message */}
      <button
        className="fixed bottom-24 right-4 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all lg:hidden"
        aria-label="New message"
      >
        <MaterialIcon name="edit_square" size={24} />
      </button>
    </div>
  )
}
