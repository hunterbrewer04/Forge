'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import MessageInput from './MessageInput'
import { fetchMessages, fetchSenderProfile } from '@/lib/services/messages'
import { processMessageMedia } from '@/lib/services/storage'
import { logger } from '@/lib/utils/logger'
import { ArrowLeft, User, BadgeCheck, MoreVertical, CheckCheck, AlertCircle, RefreshCw } from '@/components/ui/icons'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  created_at: string
  sender_name: string | null
  signedUrl?: string | null
  pending?: boolean // For optimistic updates
}

interface SenderProfile {
  full_name: string | null
}

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  otherUserName: string
  otherUserAvatar?: string | null
  onBack?: () => void
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUserName,
  otherUserAvatar,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const senderProfileCache = useRef<Map<string, SenderProfile>>(new Map())
  const supabase = createClient()

  // Cached sender profile fetch - prevents O(n) queries for real-time messages
  const getCachedSenderProfile = useCallback(async (senderId: string): Promise<string> => {
    // Check cache first
    if (senderProfileCache.current.has(senderId)) {
      return senderProfileCache.current.get(senderId)!.full_name || 'Unknown'
    }

    // Fetch if not in cache
    try {
      const profile = await fetchSenderProfile(senderId)
      senderProfileCache.current.set(senderId, { full_name: profile?.full_name || null })
      return profile?.full_name || 'Unknown'
    } catch {
      logger.error('Failed to fetch sender profile')
      return 'Unknown'
    }
  }, [])

  // Optimistic message handler - shows message immediately before server confirms
  const addOptimisticMessage = useCallback((content: string, tempId: string) => {
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      media_url: null,
      media_type: null,
      created_at: new Date().toISOString(),
      sender_name: 'You',
      pending: true,
    }
    setMessages(prev => [...prev, optimisticMessage])
  }, [conversationId, currentUserId])

  // Remove optimistic message on error
  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== tempId))
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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

  const loadMessages = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchMessages(conversationId)

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

      const messagesWithSignedUrls = await Promise.all(
        messagesWithNames.map(msg => processMessage(msg))
      )

      setMessages(messagesWithSignedUrls)
    } catch (err) {
      logger.error('Error fetching messages:', err)
      setError('Failed to load messages. Tap to retry.')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

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
          // Use cached sender profile fetch to prevent O(n) queries
          const senderName = await getCachedSenderProfile(payload.new.sender_id)

          const newMessage: Message = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            media_url: payload.new.media_url,
            media_type: payload.new.media_type,
            created_at: payload.new.created_at,
            sender_name: senderName,
            pending: false,
          }

          const processedMessage = await processMessage(newMessage)

          // Replace optimistic message with real one, or add if new
          setMessages((prev) => {
            // If this is from current user, remove any pending optimistic messages
            // with matching content (they will be replaced by the real message)
            if (payload.new.sender_id === currentUserId) {
              const withoutOptimistic = prev.filter(msg =>
                !(msg.pending && msg.content === payload.new.content)
              )
              return [...withoutOptimistic, processedMessage]
            }
            return [...prev, processedMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, getCachedSenderProfile, currentUserId])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return `Today, ${formatTimestamp(timestamp)}`
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) + ', ' + formatTimestamp(timestamp)
  }

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true
    const currentDate = new Date(currentMsg.created_at).toDateString()
    const prevDate = new Date(prevMsg.created_at).toDateString()
    return currentDate !== prevDate
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-stone-500">Loading messages...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={loadMessages}
            className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-white/5 rounded-xl transition-colors group"
          >
            <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
              <AlertCircle size={32} strokeWidth={2} className="text-red-400" />
            </div>
            <div className="text-stone-300 mb-2 font-medium">{error}</div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <RefreshCw size={16} strokeWidth={2} />
              Tap to retry
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background-dark">
      {/* Chat Header */}
      <div className="flex-none px-4 py-3 border-b border-white/10 bg-background-dark/95 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-stone-400 hover:text-white"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div
                  className="size-10 rounded-full bg-center bg-cover border border-white/10 bg-stone-700 flex items-center justify-center"
                  style={otherUserAvatar ? { backgroundImage: `url('${otherUserAvatar}')` } : undefined}
                >
                  {!otherUserAvatar && (
                    <User size={20} strokeWidth={2} className="text-stone-400" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full border-2 border-background-dark" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight text-white flex items-center gap-1">
                  {otherUserName}
                  <BadgeCheck size={14} strokeWidth={2} className="text-gold" />
                </h3>
                <p className="text-xs text-primary font-medium">Online</p>
              </div>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-white/5 text-stone-500">
            <MoreVertical size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background-dark">
        {messages.length === 0 ? (
          <div className="text-center text-stone-500 mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUserId
            const prevMessage = index > 0 ? messages[index - 1] : null
            const showDateSeparator = shouldShowDateSeparator(message, prevMessage)

            return (
              <div key={message.id}>
                {/* Date Separator */}
                {showDateSeparator && (
                  <div className="flex justify-center my-6">
                    <span className="text-[10px] font-bold tracking-widest text-stone-500 uppercase bg-[#2C2C2C] px-3 py-1 rounded-full">
                      {formatDateSeparator(message.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                {isCurrentUser ? (
                  // Sent Message
                  <div className="flex flex-col items-end max-w-[85%] ml-auto">
                    <div className="bg-primary p-3 rounded-2xl rounded-br-none text-white text-sm leading-relaxed shadow-md shadow-primary/10">
                      {/* Render image */}
                      {message.media_type === 'image' && message.signedUrl && (
                        <div className="mb-2">
                          <img
                            src={message.signedUrl}
                            alt="Shared image"
                            className="max-w-full max-h-64 rounded-lg cursor-pointer"
                            onClick={() => window.open(message.signedUrl!, '_blank')}
                          />
                        </div>
                      )}

                      {/* Render video */}
                      {message.media_type === 'video' && message.signedUrl && (
                        <div className="mb-2 relative">
                          <video
                            src={message.signedUrl}
                            controls
                            preload="metadata"
                            className="max-w-full max-h-64 rounded-lg"
                          />
                        </div>
                      )}

                      {message.content && <p>{message.content}</p>}
                    </div>
                    <div className="flex items-center gap-1 mt-1 mr-1">
                      <span className="text-[10px] text-stone-500">
                        {message.pending ? 'Sending...' : formatTimestamp(message.created_at)}
                      </span>
                      {message.pending ? (
                        <div className="size-3 border-2 border-stone-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCheck size={12} strokeWidth={2} className="text-primary" />
                      )}
                    </div>
                  </div>
                ) : (
                  // Received Message
                  <div className="flex gap-3 max-w-[85%]">
                    <div
                      className="size-8 rounded-full bg-center bg-cover shrink-0 mt-auto mb-1 bg-stone-700 flex items-center justify-center"
                      style={otherUserAvatar ? { backgroundImage: `url('${otherUserAvatar}')` } : undefined}
                    >
                      {!otherUserAvatar && (
                        <User size={14} strokeWidth={2} className="text-stone-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="bg-[#4A4A4A] p-3 rounded-2xl rounded-bl-none text-white text-sm leading-relaxed shadow-sm">
                        {/* Render image */}
                        {message.media_type === 'image' && message.signedUrl && (
                          <div className="mb-2">
                            <img
                              src={message.signedUrl}
                              alt="Shared image"
                              className="max-w-full max-h-64 rounded-lg cursor-pointer"
                              onClick={() => window.open(message.signedUrl!, '_blank')}
                            />
                          </div>
                        )}

                        {/* Render video */}
                        {message.media_type === 'video' && message.signedUrl && (
                          <div className="mb-2 relative aspect-video w-full rounded-lg overflow-hidden bg-black group cursor-pointer">
                            <video
                              src={message.signedUrl}
                              controls
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {message.content && <p>{message.content}</p>}
                      </div>
                      <span className="text-[10px] text-stone-500 ml-1">{formatTimestamp(message.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 max-w-[85%] animate-pulse">
            <div
              className="size-8 rounded-full bg-center bg-cover shrink-0 mb-1 bg-stone-700 flex items-center justify-center"
              style={otherUserAvatar ? { backgroundImage: `url('${otherUserAvatar}')` } : undefined}
            >
              {!otherUserAvatar && (
                <User size={14} strokeWidth={2} className="text-stone-400" />
              )}
            </div>
            <div className="bg-[#4A4A4A]/50 px-4 py-3 rounded-2xl rounded-bl-none w-16 flex items-center justify-center gap-1">
              <div className="size-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="size-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="size-1.5 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        conversationId={conversationId}
        onOptimisticMessage={addOptimisticMessage}
        onMessageError={removeOptimisticMessage}
      />
    </div>
  )
}
