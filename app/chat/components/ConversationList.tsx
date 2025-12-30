'use client'

import { useEffect, useState } from 'react'
import { fetchTrainerConversations } from '@/lib/services/conversations'
import { logger } from '@/lib/utils/logger'
import { User, BadgeCheck, ChevronRight, Pin } from '@/components/ui/icons'

interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  client_name: string | null
  avatar_url?: string | null
  last_message?: string
  last_message_time?: string
  unread_count?: number
  is_online?: boolean
  is_pinned?: boolean
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

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await fetchTrainerConversations(currentUserId)

        const conversationsWithNames: Conversation[] = data.map((conv, index) => ({
          id: conv.id,
          client_id: conv.client_id,
          trainer_id: conv.trainer_id,
          client_name: conv.profiles?.full_name || 'Unknown Client',
          avatar_url: conv.profiles?.avatar_url,
          last_message: 'Tap to view messages',
          last_message_time: 'Recently',
          unread_count: index === 0 ? 1 : 0, // Mock unread for demo
          is_online: index === 0, // Mock online status
          is_pinned: index === 0, // First conversation is pinned
        }))

        setConversations(conversationsWithNames)

        if (!selectedConversationId && conversationsWithNames.length > 0) {
          // Don't auto-select, let user tap
        }
      } catch (err) {
        logger.error('Error fetching conversations:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [currentUserId])

  const filteredConversations = conversations.filter(conv =>
    conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pinnedConversations = filteredConversations.filter(c => c.is_pinned)
  const recentConversations = filteredConversations.filter(c => !c.is_pinned)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark">
        <div className="text-stone-500 text-sm">Loading conversations...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark p-4">
        <div className="text-stone-500 text-sm text-center">
          No conversations yet
        </div>
      </div>
    )
  }

  const ConversationItem = ({ conversation, isPinned = false }: { conversation: Conversation; isPinned?: boolean }) => (
    <button
      onClick={() => onSelectConversation(conversation.id)}
      className={`group relative flex items-center p-3 w-full text-left transition-all cursor-pointer active:scale-[0.98] ${
        isPinned
          ? 'rounded-xl bg-[#262626] hover:bg-[#333] border border-white/5 shadow-sm mb-3'
          : 'rounded-xl hover:bg-white/5 border-b border-white/5'
      } ${selectedConversationId === conversation.id ? 'bg-white/10' : ''}`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={`rounded-full bg-center bg-cover bg-stone-700 flex items-center justify-center ${
            isPinned ? 'size-14 border-2 border-gold' : 'size-12'
          }`}
          style={conversation.avatar_url ? { backgroundImage: `url('${conversation.avatar_url}')` } : undefined}
        >
          {!conversation.avatar_url && (
            <User size={24} strokeWidth={2} className="text-stone-400" />
          )}
        </div>
        {conversation.is_online && (
          <span className={`absolute bottom-0 right-0 bg-green-500 rounded-full border-2 border-background-dark ${
            isPinned ? 'size-3.5' : 'size-3'
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="ml-4 flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className={`font-bold text-white truncate flex items-center gap-1 ${isPinned ? 'text-base' : 'text-base'}`}>
            {conversation.client_name}
            {isPinned && (
              <BadgeCheck size={14} strokeWidth={2} className="text-gold" aria-label="Certified" />
            )}
          </h4>
          <span className={`text-xs font-medium ${conversation.unread_count ? 'text-primary' : 'text-stone-500'}`}>
            {conversation.last_message_time}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate w-[85%] ${conversation.unread_count ? 'text-white font-medium' : 'text-stone-500'}`}>
            {conversation.last_message}
          </p>
          {conversation.unread_count && conversation.unread_count > 0 && (
            <span className="size-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
          )}
        </div>
      </div>

      {/* Chevron on hover */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight size={20} strokeWidth={2} className="text-stone-500" />
      </div>
    </button>
  )

  return (
    <div className="h-full bg-background-dark overflow-y-auto">
      {/* Pinned Section */}
      {pinnedConversations.length > 0 && (
        <div className="px-4 py-4">
          <h3 className="text-xs font-bold text-gold uppercase tracking-widest mb-3 flex items-center gap-1">
            <Pin size={14} strokeWidth={2} /> Pinned
          </h3>
          <div className="space-y-3">
            {pinnedConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} isPinned />
            ))}
          </div>
        </div>
      )}

      {/* Recent Section */}
      {recentConversations.length > 0 && (
        <div className="px-4 pb-20">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Recent</h3>
          <div className="space-y-1">
            {recentConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        </div>
      )}

      {filteredConversations.length === 0 && searchQuery && (
        <div className="px-4 py-8 text-center">
          <p className="text-stone-500 text-sm">No conversations matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  )
}
