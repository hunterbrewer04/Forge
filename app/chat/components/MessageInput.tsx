'use client'

import { useState, FormEvent, useRef, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface MessageInputProps {
  conversationId: string
  senderId: string
}

export default function MessageInput({ conversationId, senderId }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // File validation constants
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB
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
      // Determine media type
      const mediaType = file.type.startsWith('image/') ? 'image' : 'video'

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`
      const filePath = `${conversationId}/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setUploadProgress(100)

      // Store the file path (not a public URL) for secure, authenticated access
      // The frontend will generate signed URLs on-demand when displaying media

      // Insert message with media (store file path, not URL)
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: null,
          media_url: filePath, // Store path, not public URL
          media_type: mediaType,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        throw new Error(`Failed to save message: ${insertError.message}`)
      }

      // Reset state
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
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: message.trim(),
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
      } else {
        setMessage('')
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

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">
              Uploading {selectedFile?.type.startsWith('image/') ? 'photo' : 'video'}...
            </span>
            <span className="text-sm text-gray-600">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{uploadError}</p>
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

      <div className="flex gap-2">
        {/* Upload button */}
        <button
          type="button"
          onClick={handleUploadButtonClick}
          disabled={sending || uploading}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Upload photo or video"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
            />
          </svg>
        </button>

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending || uploading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!message.trim() || sending || uploading}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  )
}
