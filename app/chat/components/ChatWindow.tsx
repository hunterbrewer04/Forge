'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import MessageInput from './MessageInput'
import { fetchMessages, fetchSenderProfile } from '@/lib/services/messages'
import { processMessageMedia, processMessagesMedia } from '@/lib/services/storage'
import { logger } from '@/lib/utils/logger'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  created_at: string
  sender_name: string | null
  signedUrl?: string | null // For secure, authenticated media access
}

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  otherUserName: string
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUserName,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Process message to add signed URL for media (uses storage service)
  const processMessage = async (message: Message): Promise<Message> => {
    if (message.media_url && message.media_type) {
      const processed = await processMessageMedia(message)
      return processed as Message
    }
    return message
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true)

      try {
        const data = await fetchMessages(conversationId)

        // Transform the data to include sender_name
        const messagesWithNames: Message[] = data.map((msg) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
          media_url: msg.media_url,
          media_type: msg.media_type,
          created_at: msg.created_at,
          sender_name: msg.profiles?.full_name || 'Unknown',
        }))

        // Process messages to generate signed URLs for media
        const messagesWithSignedUrls = await Promise.all(
          messagesWithNames.map(msg => processMessage(msg))
        )

        setMessages(messagesWithSignedUrls)
      } catch (err) {
        logger.error('Error fetching messages:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversationId])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch the sender's name for the new message using service
          let senderName = 'Unknown'
          try {
            const senderProfile = await fetchSenderProfile(payload.new.sender_id)
            senderName = senderProfile?.full_name || 'Unknown'
          } catch {
            logger.error('Failed to fetch sender profile')
          }

          const newMessage: Message = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            media_url: payload.new.media_url,
            media_type: payload.new.media_type,
            created_at: payload.new.created_at,
            sender_name: senderName,
          }

          // Process media to generate signed URL if needed
          const processedMessage = await processMessage(newMessage)

          setMessages((prev) => [...prev, processedMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">{otherUserName}</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUserId
            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-100 text-gray-900'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className={`text-xs font-semibold mb-1 ${isCurrentUser ? 'text-blue-700' : 'text-gray-600'}`}>
                    {isCurrentUser ? 'You' : message.sender_name}
                  </div>

                  {/* Render image */}
                  {message.media_type === 'image' && message.signedUrl && (
                    <div className="mb-2">
                      <img
                        src={message.signedUrl}
                        alt="Shared image"
                        className="max-w-full max-h-96 rounded-lg cursor-pointer"
                        onClick={() => window.open(message.signedUrl!, '_blank')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const errorDiv = document.createElement('div')
                          errorDiv.className = 'text-red-500 text-sm'
                          errorDiv.textContent = 'Failed to load image'
                          target.parentNode?.appendChild(errorDiv)
                        }}
                      />
                    </div>
                  )}

                  {/* Render video */}
                  {message.media_type === 'video' && message.signedUrl && (
                    <div className="mb-2">
                      <video
                        src={message.signedUrl}
                        controls
                        preload="metadata"
                        className="max-w-full max-h-96 rounded-lg"
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                  )}

                  {/* Render text content */}
                  {message.content && (
                    <div className="break-words">{message.content}</div>
                  )}

                  <div
                    className={`text-xs mt-1 ${
                      isCurrentUser ? 'text-gray-600' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(message.created_at)}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input - uses AuthContext for user ID (security improvement) */}
      <MessageInput conversationId={conversationId} />
    </div>
  )
}
