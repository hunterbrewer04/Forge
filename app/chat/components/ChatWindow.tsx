'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase-browser'
import MessageInput from './MessageInput'
import { useMediaViewer } from './useMediaViewer'

const MediaViewer = dynamic(() => import('./MediaViewer'), { ssr: false })
import { fetchMessages, fetchSenderProfile, markMessagesAsRead } from '@/lib/services/messages'
import { processMessageMedia } from '@/lib/services/storage'
import { logger } from '@/lib/utils/logger'
import { MessageListSkeleton } from '@/components/skeletons/MessageSkeleton'
import { ArrowLeft, User, Video as VideoIcon, Info, AlertCircle, RefreshCw, CheckCheck, Check, Maximize } from '@/components/ui/icons'
import Image from 'next/image'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: string | null
  created_at: string
  read_at?: string | null
  sender_name: string | null
  signedUrl?: string | null
  pending?: boolean
}

interface SenderProfile {
  full_name: string | null
}

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  otherUserId?: string
  otherUserName: string
  otherUserAvatar?: string | null
  onBack?: () => void
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessagesLength = useRef(0)
  const senderProfileCache = useRef<Map<string, SenderProfile>>(new Map())
  const supabase = useMemo(() => createClient(), [])

  const {
    isOpen: mediaViewerOpen,
    slides: mediaSlides,
    initialIndex: mediaIndex,
    closeViewer: closeMediaViewer,
    openSingleImage,
    openSingleVideo
  } = useMediaViewer()

  const getCachedSenderProfile = useCallback(async (senderId: string): Promise<string> => {
    if (senderProfileCache.current.has(senderId)) {
      return senderProfileCache.current.get(senderId)!.full_name || 'Unknown'
    }

    try {
      const profile = await fetchSenderProfile(senderId)
      senderProfileCache.current.set(senderId, { full_name: profile?.full_name || null })
      return profile?.full_name || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }, [])

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

  const removeOptimisticMessage = useCallback((tempId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== tempId))
  }, [])

  const processMessage = useCallback(async (message: Message): Promise<Message> => {
    if (message.media_url && message.media_type) {
      const processed = await processMessageMedia(message)
      return processed as Message
    }
    return message
  }, [])

  const handleImageLoad = useCallback(() => {
    // Re-check if near bottom and scroll if needed
    const container = messagesContainerRef.current
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  useEffect(() => {
    // Always scroll to bottom on initial load (messages.length transition from 0)
    // Or when near bottom and new messages arrive
    const container = messagesContainerRef.current
    if (!container) return

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
    const isInitialLoad = prevMessagesLength.current === 0 && messages.length > 0

    if (isInitialLoad || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' })
    }

    prevMessagesLength.current = messages.length
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
        read_at: msg.read_at,
        sender_name: msg.profiles?.full_name || 'Unknown',
      }))

      const messagesWithSignedUrls = await Promise.all(
        messagesWithNames.map(msg => processMessage(msg))
      )

      setMessages(messagesWithSignedUrls)

      // Mark messages as read when conversation opens
      if (conversationId && currentUserId) {
        try {
          await markMessagesAsRead(conversationId, currentUserId)
        } catch (err) {
          logger.error('Error marking messages as read:', err)
        }
      }

      // After messages load, scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      }, 100)
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
          const senderName = await getCachedSenderProfile(payload.new.sender_id)

          const newMessage: Message = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            media_url: payload.new.media_url,
            media_type: payload.new.media_type,
            created_at: payload.new.created_at,
            read_at: payload.new.read_at,
            sender_name: senderName,
            pending: false,
          }

          const processedMessage = await processMessage(newMessage)

          setMessages((prev) => {
            if (payload.new.sender_id === currentUserId) {
              const withoutOptimistic = prev.filter(msg =>
                !(msg.pending && msg.content === payload.new.content)
              )
              return [...withoutOptimistic, processedMessage]
            }
            return [...prev, processedMessage]
          })

          // Mark new messages from other users as read
          if (payload.new.sender_id !== currentUserId) {
            try {
              await markMessagesAsRead(conversationId, currentUserId)
            } catch (err) {
              logger.error('Error marking new message as read:', err)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Update local message state when read_at changes
          setMessages(prev => prev.map(msg =>
            msg.id === payload.new.id
              ? { ...msg, read_at: payload.new.read_at }
              : msg
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, getCachedSenderProfile, currentUserId, processMessage])

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

    if (isToday) return 'TODAY'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  }

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true
    const currentDate = new Date(currentMsg.created_at).toDateString()
    const prevDate = new Date(prevMsg.created_at).toDateString()
    return currentDate !== prevDate
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Chat Header -- always rendered */}
      <div className="flex-none border-b border-border bg-bg-primary z-10 pt-safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full bg-bg-secondary flex items-center justify-center relative overflow-hidden">
                  {otherUserAvatar ? (
                    <Image
                      src={otherUserAvatar}
                      alt={otherUserName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User size={20} className="text-text-muted" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full ring-2 ring-bg-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary leading-tight">
                  {otherUserName || 'Chat'}
                </h3>
                <span className="text-xs text-success">Online</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button className="size-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
              <VideoIcon size={22} />
            </button>
            <button className="size-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
              <Info size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Body -- switches on state */}
      {loading ? (
        <MessageListSkeleton />
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={loadMessages}
            className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-bg-secondary rounded-2xl transition-colors group"
          >
            <div className="size-16 rounded-full bg-error/10 flex items-center justify-center mb-4 group-hover:bg-error/20 transition-colors">
              <AlertCircle size={32} className="text-error" />
            </div>
            <div className="text-text-primary mb-2 font-medium">{error}</div>
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <RefreshCw size={16} />
              Tap to retry
            </div>
          </button>
        </div>
      ) : (
        <>
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-bg-primary">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted mt-8">
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
                  <div className="flex justify-center my-4">
                    <span className="text-[10px] font-semibold tracking-wider text-text-muted bg-bg-secondary px-3 py-1 rounded-full">
                      {formatDateSeparator(message.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                {isCurrentUser ? (
                  // Sent Message (Blue)
                  <div className="flex flex-col items-end max-w-[80%] ml-auto">
                    <div className="bg-bubble-sent text-bubble-sent-text px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
                      {message.media_type === 'image' && message.signedUrl && (
                        <div className="mb-2 relative cursor-pointer" onClick={() => openSingleImage(message.signedUrl!, 'Shared image')}>
                          <Image
                            src={message.signedUrl}
                            alt="Shared image"
                            width={200}
                            height={200}
                            className="max-w-full max-h-48 rounded-lg object-cover"
                            onLoad={handleImageLoad}
                          />
                        </div>
                      )}

                      {message.media_type === 'video' && message.signedUrl && (
                        <div className="mb-2 relative group">
                          <video
                            src={message.signedUrl}
                            controls
                            preload="metadata"
                            className="max-w-full max-h-48 rounded-lg"
                          />
                          <button
                            onClick={() => openSingleVideo(message.signedUrl!)}
                            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="View fullscreen"
                          >
                            <Maximize size={20} />
                          </button>
                        </div>
                      )}

                      {message.content && <p>{message.content}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-text-muted mt-1 mr-1">
                      <span>{message.pending ? 'Sending...' : formatTimestamp(message.created_at)}</span>
                      {!message.pending && (
                        <span className="flex items-center">
                          {message.read_at ? (
                            <CheckCheck size={14} className="text-[#ff6714]" />
                          ) : (
                            <Check size={14} className="text-text-muted" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  // Received Message (Gray)
                  <div className="flex gap-2 max-w-[80%]">
                    <div className="size-7 rounded-full shrink-0 mt-auto mb-5 bg-bg-secondary flex items-center justify-center relative overflow-hidden">
                      {otherUserAvatar ? (
                        <Image
                          src={otherUserAvatar}
                          alt={otherUserName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <User size={14} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="bg-bubble-received text-bubble-received-text px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed">
                        {message.media_type === 'image' && message.signedUrl && (
                          <div className="mb-2 relative cursor-pointer" onClick={() => openSingleImage(message.signedUrl!, 'Shared image')}>
                            <Image
                              src={message.signedUrl}
                              alt="Shared image"
                              width={200}
                              height={200}
                              className="max-w-full max-h-48 rounded-lg object-cover"
                              onLoad={handleImageLoad}
                            />
                          </div>
                        )}

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
                              <Maximize size={20} />
                            </button>
                          </div>
                        )}

                        {message.content && <p>{message.content}</p>}
                      </div>
                      <span className="text-[10px] text-text-muted mt-1 ml-1">
                        {formatTimestamp(message.created_at)}
                      </span>
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
        recipientId={otherUserId}
        onOptimisticMessage={addOptimisticMessage}
        onMessageError={removeOptimisticMessage}
      />
        </>
      )}

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
