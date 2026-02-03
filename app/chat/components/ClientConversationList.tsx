'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { fetchClientConversation } from '@/lib/services/conversations'
import { logger } from '@/lib/utils/logger'
import { AlertCircle, RefreshCw, User } from '@/components/ui/icons'

interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  trainer_name: string | null
  trainer_avatar_url?: string | null
}

interface ClientConversationListProps {
  currentUserId: string
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
  searchQuery?: string
}

export default function ClientConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  searchQuery = '',
}: ClientConversationListProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConversation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch conversation where current user is the client
      const data = await fetchClientConversation(currentUserId)

      const conv: Conversation = {
        id: data.id,
        client_id: data.client_id,
        trainer_id: data.trainer_id,
        trainer_name: data.profiles?.full_name || 'Your Trainer',
        trainer_avatar_url: data.profiles?.avatar_url || null,
      }
      setConversation(conv)

      // Auto-select the conversation
      if (!selectedConversationId) {
        onSelectConversation(conv.id)
      }
    } catch (err) {
      logger.error('Error fetching conversation:', err)
      setError('Failed to load conversation. Tap to retry.')
    } finally {
      setLoading(false)
    }
  }, [currentUserId, onSelectConversation])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark p-4">
        <button
          onClick={loadConversation}
          className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:bg-white/5 rounded-2xl transition-colors group"
        >
          <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-3 group-hover:bg-red-500/20 transition-colors">
            <AlertCircle size={28} strokeWidth={2} className="text-red-400" />
          </div>
          <div className="text-stone-300 mb-2 text-sm font-medium">{error}</div>
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <RefreshCw size={14} strokeWidth={2} />
            Tap to retry
          </div>
        </button>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark p-4">
        <div className="text-stone-500 text-sm text-center">
          No trainer assigned
        </div>
      </div>
    )
  }

  // Filter conversation based on search query
  const matchesSearch = conversation.trainer_name
    ?.toLowerCase()
    .includes(searchQuery.toLowerCase()) ?? true

  return (
    <div className="h-full bg-background-dark overflow-y-auto">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Messages</h2>
      </div>
      {matchesSearch ? (
        <div className="mx-4 mt-4">
          <button
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full rounded-2xl bg-surface-mid border p-4 text-left hover:bg-white/5 transition-colors ${
              selectedConversationId === conversation.id
                ? 'border-primary/30 bg-primary/5'
                : 'border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {conversation.trainer_avatar_url ? (
                <Image
                  src={conversation.trainer_avatar_url}
                  alt={conversation.trainer_name || 'Trainer'}
                  width={48}
                  height={48}
                  className="rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="size-12 rounded-xl bg-stone-700 flex items-center justify-center shrink-0">
                  <span className="text-white text-lg font-bold">
                    {conversation.trainer_name?.[0]?.toUpperCase() || 'T'}
                  </span>
                </div>
              )}
              <div>
                <div className="text-base font-bold text-white">
                  {conversation.trainer_name}
                </div>
                <div className="text-xs text-primary font-medium mt-0.5">
                  Your Trainer
                </div>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-stone-500 text-sm">No conversations matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  )
}
