'use client'

import { useState, FormEvent } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface MessageInputProps {
  conversationId: string
  senderId: string
}

export default function MessageInput({ conversationId, senderId }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

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

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
        />
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  )
}
