'use client'

import { useState, FormEvent, useRef, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Smile, Send } from '@/components/ui/icons'

interface MessageInputProps {
  conversationId: string
  senderId?: string
}

const QUICK_REPLIES = [
  'Got it, thanks!',
  'On my way',
  'Sounds good',
]

export default function MessageInput({ conversationId }: MessageInputProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

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
      console.error('Upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!message.trim() || sending) return

    setSending(true)

    try {
      if (!user?.id) {
        alert('You must be logged in to send messages')
        return
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim(),
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
      } else {
        setMessage('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleQuickReply = async (reply: string) => {
    if (sending) return

    setSending(true)

    try {
      if (!user?.id) {
        alert('You must be logged in to send messages')
        return
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: reply,
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error sending quick reply:', error)
        alert('Failed to send message. Please try again.')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Failed to send message. Please try again.')
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
    <div className="flex-none bg-background-dark border-t border-white/10 pb-safe-bottom pt-2">
      {/* Upload progress bar */}
      {uploading && (
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-stone-400">
              Uploading {selectedFile?.type.startsWith('image/') ? 'photo' : 'video'}...
            </span>
            <span className="text-sm text-stone-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="mx-4 mb-3 p-2 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{uploadError}</p>
        </div>
      )}

      {/* Quick Replies */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            onClick={() => handleQuickReply(reply)}
            disabled={sending || uploading}
            className="shrink-0 bg-[#2C2C2C] border border-white/5 hover:bg-white/10 text-xs font-medium text-white px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {reply}
          </button>
        ))}
      </div>

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
          className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-[#2C2C2C] text-stone-500 hover:text-primary transition-colors shrink-0 mb-0.5 disabled:opacity-50 active:scale-95"
          aria-label="Upload photo or video"
        >
          <Plus size={20} strokeWidth={2} />
        </button>

        {/* Text input */}
        <div className="flex-1 bg-[#2C2C2C] rounded-[1.25rem] min-h-[44px] flex items-center px-4 py-2 border border-transparent focus-within:border-primary/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            placeholder="Type a message..."
            disabled={sending || uploading}
            rows={1}
            className="w-full bg-transparent border-none p-0 text-sm text-white placeholder-stone-500 focus:ring-0 resize-none max-h-24 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            className="flex items-center justify-center size-8 min-w-[32px] min-h-[32px] ml-2 text-stone-500 hover:text-white transition-colors active:scale-95"
            aria-label="Add emoji"
          >
            <Smile size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || sending || uploading}
          className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/20 transition-all active:scale-95 shrink-0 mb-0.5 disabled:opacity-50 disabled:bg-stone-600 disabled:shadow-none"
          aria-label="Send message"
        >
          <Send size={20} strokeWidth={2} className="ml-0.5" />
        </button>
      </form>
    </div>
  )
}
