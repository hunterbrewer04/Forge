'use client'

import { useMemo } from 'react'
import { ChatClientProvider, ChatRoomProvider } from '@ably/chat/react'
import { getChatClient } from '@/lib/ably-chat-browser'

interface ChatProvidersProps {
  conversationId: string
  children: React.ReactNode
}

export default function ChatProviders({ conversationId, children }: ChatProvidersProps) {
  const chatClient = getChatClient()

  // Memoize options so ChatRoomProvider doesn't recreate the room on each render
  const roomOptions = useMemo(() => ({}), [])

  return (
    <ChatClientProvider client={chatClient}>
      <ChatRoomProvider name={`chat:${conversationId}`} options={roomOptions}>
        {children}
      </ChatRoomProvider>
    </ChatClientProvider>
  )
}
