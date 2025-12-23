'use client'

import { useEffect, useState } from 'react'
import { fetchTrainerConversations } from '@/lib/services/conversations'
import { logger } from '@/lib/utils/logger'

interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  client_name: string | null
}

interface ConversationListProps {
  currentUserId: string
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
}

export default function ConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConversations = async () => {
      try {
        // Fetch conversations where current user is the trainer
        const data = await fetchTrainerConversations(currentUserId)

        // Transform the data to include client_name
        const conversationsWithNames: Conversation[] = data.map((conv) => ({
          id: conv.id,
          client_id: conv.client_id,
          trainer_id: conv.trainer_id,
          client_name: conv.profiles?.full_name || 'Unknown Client',
        }))

        setConversations(conversationsWithNames)

        // Auto-select first conversation if none selected
        if (!selectedConversationId && conversationsWithNames.length > 0) {
          onSelectConversation(conversationsWithNames[0].id)
        }
      } catch (err) {
        logger.error('Error fetching conversations:', err)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [currentUserId, selectedConversationId, onSelectConversation])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-gray-500 text-sm">Loading conversations...</div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200 p-4">
        <div className="text-gray-500 text-sm text-center">
          No conversations yet
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
              selectedConversationId === conversation.id
                ? 'bg-blue-50 border-l-4 border-blue-500'
                : 'border-l-4 border-transparent'
            }`}
          >
            <div className="font-medium text-gray-900">
              {conversation.client_name}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Click to open chat
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
