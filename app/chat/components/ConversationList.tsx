'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

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
  const supabase = createClient()

  useEffect(() => {
    const fetchConversations = async () => {
      // Fetch conversations where current user is the trainer
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          client_id,
          trainer_id,
          client:client_id (
            full_name
          )
        `)
        .eq('trainer_id', currentUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', error)
        setLoading(false)
        return
      }

      // Transform the data to include client_name
      const conversationsWithNames = data?.map((conv: any) => ({
        id: conv.id,
        client_id: conv.client_id,
        trainer_id: conv.trainer_id,
        client_name: conv.client?.full_name || 'Unknown Client',
      })) || []

      setConversations(conversationsWithNames)
      setLoading(false)

      // Auto-select first conversation if none selected
      if (!selectedConversationId && conversationsWithNames.length > 0) {
        onSelectConversation(conversationsWithNames[0].id)
      }
    }

    fetchConversations()
  }, [currentUserId, supabase, selectedConversationId, onSelectConversation])

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
