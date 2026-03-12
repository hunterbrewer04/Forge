'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { X, Search, User, Loader2 } from '@/components/ui/icons'
import {
  fetchAvailableClients,
  createConversation,
  type AvailableClient,
} from '@/lib/services/conversations'
import { refreshAblyToken } from '@/lib/ably-browser'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectConversation: (conversationId: string) => void
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onSelectConversation,
}: NewConversationModalProps) {
  const [clients, setClients] = useState<AvailableClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    setError(null)
    setSearch('')

    fetchAvailableClients()
      .then(setClients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isOpen])

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleEscape])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const handleSelect = async (client: AvailableClient) => {
    if (creating) return
    setCreating(client.id)
    setError(null)

    try {
      const data = await createConversation(client.id)
      onSelectConversation(data.conversation.id)
      onClose()
      // Fire-and-forget: refresh Ably token so it includes the new channel
      refreshAblyToken().catch(console.error)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-auto sm:mx-4 bg-bg-primary rounded-t-2xl sm:rounded-2xl border border-border shadow-xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            New Conversation
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center size-9 rounded-full hover:bg-bg-secondary transition-colors text-text-secondary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-text-muted" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-border rounded-xl bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              placeholder="Search by name or email"
              autoFocus
            />
          </div>
        </div>

        {/* Client list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          )}

          {error && (
            <div className="px-4 py-8 text-center">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-text-secondary text-sm">
                {search
                  ? `No clients matching "${search}"`
                  : 'All clients already have conversations'}
              </p>
            </div>
          )}

          {!loading &&
            filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelect(client)}
                disabled={creating !== null}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors disabled:opacity-50"
              >
                <div className="size-10 rounded-full bg-bg-secondary overflow-hidden relative shrink-0">
                  {client.avatar_url ? (
                    <Image
                      src={client.avatar_url}
                      alt={client.full_name || 'Avatar'}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <User size={20} className="text-text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {client.full_name || 'Unknown'}
                  </p>
                  {client.email && (
                    <p className="text-xs text-text-secondary truncate">
                      {client.email}
                    </p>
                  )}
                </div>
                {creating === client.id && (
                  <Loader2 size={16} className="text-primary animate-spin shrink-0" />
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
