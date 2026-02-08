'use client'

import { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Send, X } from '@/components/ui/icons'

interface MessageInputProps {
  conversationId: string
  recipientId?: string
  onOptimisticMessage?: (content: string, tempId: string) => void
  onMessageError?: (tempId: string) => void
}

export default function MessageInput({
  conversationId,
  recipientId,
  onOptimisticMessage,
  onMessageError,
}: MessageInputProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [error])

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo']

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload jpg, png, gif, webp, mp4, mov, or avi files.'
      }
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return {
        valid: false,
        error: 'Image too large. Maximum size is 10MB.'
      }
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: 'Video too large. Maximum size is 50MB.'
      }
    }

    return { valid: true }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setSelectedFile(file)
    setUploadError(null)
    handleFileUpload(file)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      if (!user?.id) {
        throw new Error('You must be logged in to upload files')
      }

      setUploadProgress(25)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversationId', conversationId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(75)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { filePath, mediaType } = await response.json()

      setUploadProgress(90)

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: null,
          media_url: filePath,
          media_type: mediaType,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        throw new Error(`Failed to save message: ${insertError.message}`)
      }

      setUploadProgress(100)

      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!message.trim() || sending) return

    const messageContent = message.trim()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Clear input immediately for instant feedback
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Show optimistic message immediately
    onOptimisticMessage?.(messageContent, tempId)

    setSending(true)

    try {
      if (!user?.id) {
        onMessageError?.(tempId)
        setError('You must be logged in to send messages')
        return
      }

      const { error: dbError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
          created_at: new Date().toISOString(),
        })

      if (dbError) {
        // Remove optimistic message and restore input
        onMessageError?.(tempId)
        setMessage(messageContent)
        setError('Failed to send message. Please try again.')
      } else if (recipientId) {
        // Fire-and-forget push notification to recipient
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId,
            title: 'New Message',
            body: messageContent.length > 100 ? messageContent.slice(0, 97) + '...' : messageContent,
            url: '/chat',
            type: 'message',
          }),
        }).catch(() => {}) // Best-effort, don't block chat
      }
    } catch (err) {
      // Remove optimistic message and restore input
      onMessageError?.(tempId)
      setMessage(messageContent)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  return (
    <div className="flex-none bg-bg-primary border-t border-border pb-safe-bottom pt-2">
      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-3 px-3 py-2 bg-error/10 text-error text-sm rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 shrink-0 p-1 hover:bg-red-500/20 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-muted">
              Uploading {selectedFile?.type.startsWith('image/') ? 'photo' : 'video'}...
            </span>
            <span className="text-sm text-text-muted">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-bg-secondary rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-primary to-orange-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload error message */}
      {uploadError && (
        <div className="mx-4 mb-3 p-2 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">{uploadError}</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="px-4 flex items-end gap-2 pb-4">
        {/* Attachment button */}
        <button
          type="button"
          onClick={handleUploadButtonClick}
          disabled={sending || uploading}
          className="flex items-center justify-center size-10 min-w-[44px] min-h-[44px] rounded-xl bg-bg-secondary border border-border text-text-muted hover:text-primary transition-colors shrink-0 mb-0.5 disabled:opacity-50 active:scale-95"
          aria-label="Upload photo or video"
        >
          <Plus size={20} strokeWidth={2} />
        </button>

        {/* Text input */}
        <div className="flex-1 bg-bg-input rounded-2xl border border-border focus-within:border-primary/40 min-h-[44px] flex items-center px-4 py-2 transition-colors">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            placeholder="Type a message..."
            disabled={sending || uploading}
            rows={1}
            className="w-full bg-transparent border-none p-0 text-sm text-text-primary placeholder-text-muted focus:ring-0 resize-none max-h-24 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || sending || uploading}
          className="flex items-center justify-center size-10 min-w-[44px] min-h-[44px] rounded-xl bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0 mb-0.5 disabled:opacity-50 disabled:bg-bg-secondary disabled:border disabled:border-border disabled:text-text-muted disabled:shadow-none"
          aria-label="Send message"
        >
          <Send size={20} strokeWidth={2} className="ml-0.5" />
        </button>
      </form>
    </div>
  )
}
