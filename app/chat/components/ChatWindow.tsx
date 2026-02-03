'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import MessageInput from './MessageInput'
import MediaViewer, { useMediaViewer } from './MediaViewer'
import { fetchMessages, fetchSenderProfile } from '@/lib/services/messages'
import { processMessageMedia } from '@/lib/services/storage'
import { logger } from '@/lib/utils/logger'
import { MessageListSkeleton } from '@/components/skeletons/MessageSkeleton'
import { ArrowLeft, User, CheckCheck, AlertCircle, RefreshCw } from '@/components/ui/icons'
import Image from 'next/image'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const senderProfileCache = useRef<Map<string, SenderProfile>>(new Map())
  const supabase = useMemo(() => createClient(), [])

  // Media lightbox viewer state
  const {
    isOpen: mediaViewerOpen,
    slides: mediaSlides,
    initialIndex: mediaIndex,
    closeViewer: closeMediaViewer,
    openSingleImage,
    openSingleVideo
  } = useMediaViewer()

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

  const processMessage = useCallback(async (message: Message): Promise<Message> => {
    if (message.media_url && message.media_type) {
      const processed = await processMessageMedia(message)
      return processed as Message
    }
    return message
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
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
  }, [conversationId, processMessage])

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
        <MessageListSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background-dark">
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={loadMessages}
            className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-white/5 rounded-2xl transition-colors group"
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
      <div className="flex-none px-4 py-3 border-b border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/5 transition-colors text-stone-400 hover:text-white"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-11 rounded-xl border-2 border-white/10 bg-stone-700 flex items-center justify-center relative overflow-hidden">
                  {otherUserAvatar ? (
                    <Image
                      src={otherUserAvatar}
                      alt={otherUserName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User size={20} strokeWidth={2} className="text-stone-400" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 size-2.5 bg-emerald-400 rounded-full ring-2 ring-[#1a1a1a]" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight text-white">
                  {otherUserName}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background-dark">
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
                    <span className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase bg-surface-mid border border-white/5 px-4 py-1.5 rounded-full">
                      {formatDateSeparator(message.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                {isCurrentUser ? (
                  // Sent Message
                  <div className="flex flex-col items-end max-w-[85%] ml-auto">
                    <div className="bg-primary px-4 py-3 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed shadow-md shadow-primary/10">
                      {/* Render image */}
                      {message.media_type === 'image' && message.signedUrl && (
                        <div className="mb-2 relative cursor-pointer" onClick={() => openSingleImage(message.signedUrl!, 'Shared image')}>
                          <Image
                            src={message.signedUrl}
                            alt="Shared image"
                            width={200}
                            height={200}
                            className="max-w-full max-h-64 rounded-lg object-cover"
                          />
                        </div>
                      )}

                      {/* Render video */}
                      {message.media_type === 'video' && message.signedUrl && (
                        <div className="mb-2 relative group">
                          <video
                            src={message.signedUrl}
                            controls
                            preload="metadata"
                            className="max-w-full max-h-64 rounded-lg"
                          />
                          <button
                            onClick={() => openSingleVideo(message.signedUrl!)}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="View fullscreen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {message.content && <p>{message.content}</p>}
                    </div>
                    <div className="flex items-center gap-1 mt-1 mr-1">
                      <span className="text-[10px] text-stone-600">
                        {message.pending ? 'Sending...' : formatTimestamp(message.created_at)}
                      </span>
                      {message.pending ? (
                        <div className="size-3 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCheck size={12} strokeWidth={2} className="text-primary" />
                      )}
                    </div>
                  </div>
                ) : (
                  // Received Message
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="size-7 rounded-lg shrink-0 mt-auto mb-1 bg-stone-700 flex items-center justify-center relative overflow-hidden">
                      {otherUserAvatar ? (
                        <Image
                          src={otherUserAvatar}
                          alt={otherUserName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User size={14} strokeWidth={2} className="text-stone-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="bg-[#2a2a2a] px-4 py-3 rounded-2xl rounded-bl-sm text-white text-sm leading-relaxed shadow-sm">
                        {/* Render image */}
                        {message.media_type === 'image' && message.signedUrl && (
                          <div className="mb-2 relative cursor-pointer" onClick={() => openSingleImage(message.signedUrl!, 'Shared image')}>
                            <Image
                              src={message.signedUrl}
                              alt="Shared image"
                              width={200}
                              height={200}
                              className="max-w-full max-h-64 rounded-lg object-cover"
                            />
                          </div>
                        )}

                        {/* Render video */}
                        {message.media_type === 'video' && message.signedUrl && (
                          <div className="mb-2 relative aspect-video w-full rounded-lg overflow-hidden bg-black group">
                            <video
                              src={message.signedUrl}
                              controls
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => openSingleVideo(message.signedUrl!)}
                              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="View fullscreen"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {message.content && <p>{message.content}</p>}
                      </div>
                      <span className="text-[10px] text-stone-600 ml-1">{formatTimestamp(message.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        conversationId={conversationId}
        onOptimisticMessage={addOptimisticMessage}
        onMessageError={removeOptimisticMessage}
      />

      {/* Media Lightbox Viewer */}
      <MediaViewer
        isOpen={mediaViewerOpen}
        onClose={closeMediaViewer}
        slides={mediaSlides}
        initialIndex={mediaIndex}
      />
    </div>
  )
}
