'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  trainer_name: string | null
}

interface ClientConversationListProps {
  currentUserId: string
  selectedConversationId: string | null
  onSelectConversation: (conversationId: string) => void
}

export default function ClientConversationList({
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}: ClientConversationListProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchConversation = async () => {
      // Fetch conversation where current user is the client
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          client_id,
          trainer_id,
          trainer:trainer_id (
            full_name
          )
        `)
        .eq('client_id', currentUserId)
        .single()

      if (error) {
        console.error('Error fetching conversation:', error)
        setLoading(false)
        return
      }

      if (data) {
        const conv: Conversation = {
          id: data.id,
          client_id: data.client_id,
          trainer_id: data.trainer_id,
          trainer_name: (data.trainer as any)?.full_name || 'Your Trainer',
        }
        setConversation(conv)

        // Auto-select the conversation
        if (!selectedConversationId) {
          onSelectConversation(conv.id)
        }
      }

      setLoading(false)
    }

    fetchConversation()
  }, [currentUserId, supabase, selectedConversationId, onSelectConversation])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-white border-r border-gray-200 p-4">
        <div className="text-gray-500 text-sm text-center">
          No trainer assigned
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
      </div>
      <div className="divide-y divide-gray-200">
        <button
          onClick={() => onSelectConversation(conversation.id)}
          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
            selectedConversationId === conversation.id
              ? 'bg-blue-50 border-l-4 border-blue-500'
              : 'border-l-4 border-transparent'
          }`}
        >
          <div className="font-medium text-gray-900">
            {conversation.trainer_name}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Your Trainer
          </div>
        </button>
      </div>
    </div>
  )
}
