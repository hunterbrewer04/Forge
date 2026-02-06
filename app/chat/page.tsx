'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ConversationList from './components/ConversationList'
import ClientConversationList from './components/ClientConversationList'
import ChatWindow from './components/ChatWindow'
import ChatLayout from '@/components/layout/ChatLayout'
import { logger } from '@/lib/utils/logger'
import { fetchClientConversation, fetchConversationById } from '@/lib/services/conversations'
import { ConversationListSkeleton } from '@/components/skeletons/ConversationSkeleton'
import MaterialIcon from '@/components/ui/MaterialIcon'

interface ConversationInfo {
  id: string
  client_id: string
  trainer_id: string
  client_name: string | null
  trainer_name: string | null
  avatar_url?: string | null
}

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showThread, setShowThread] = useState(false)

  useEffect(() => {
    logger.debug('[ChatPage] Component mounted')
  }, [])

  // Extended timeout (15 seconds) with graceful degradation
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true)
      }, 15000)
      return () => clearTimeout(timeout)
    } else {
      setLoadingTimeout(false)
    }
  }, [loading])

  useEffect(() => {
    if (!loading && !user) {
      setError('No user found. Redirecting to login...')
      router.push('/login')
    } else if (!loading && user && !profile) {
      setError('Profile not found. Please contact support.')
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    let mounted = true

    const loadClientConversation = async () => {
      if (!profile || !profile.is_client || profile.is_trainer || !user?.id) return

      setLoadingConversation(true)
      setError(null)

      try {
        const data = await fetchClientConversation(user.id)
        if (!mounted) return

        const convInfo: ConversationInfo = {
          id: data.id,
          client_id: data.client_id,
          trainer_id: data.trainer_id,
          client_name: profile.full_name,
          trainer_name: data.profiles?.full_name || 'Your Trainer',
          avatar_url: data.profiles?.avatar_url,
        }
        setConversationInfo(convInfo)
        setSelectedConversationId(data.id)
      } catch (err) {
        if (!mounted) return
        const error = err as { code?: string; message?: string }
        if (error.code === 'PGRST116') {
          setError('No conversation found. Please contact support to set up your trainer.')
        } else {
          setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
        }
      } finally {
        if (mounted) setLoadingConversation(false)
      }
    }

    if (profile && profile.is_client && !profile.is_trainer) {
      loadClientConversation()
    }

    return () => { mounted = false }
  }, [profile, user?.id])

  useEffect(() => {
    let mounted = true

    const loadConversationInfo = async () => {
      if (!selectedConversationId || !profile?.is_trainer) return

      setLoadingConversation(true)
      setError(null)

      try {
        const data = await fetchConversationById(selectedConversationId, true)
        if (!mounted) return

        const convInfo: ConversationInfo = {
          id: data.id,
          client_id: data.client_id,
          trainer_id: data.trainer_id,
          client_name: data.profiles?.full_name || 'Client',
          trainer_name: profile.full_name,
          avatar_url: data.profiles?.avatar_url,
        }
        setConversationInfo(convInfo)
      } catch (err) {
        if (!mounted) return
        const error = err as { message?: string }
        setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
      } finally {
        if (mounted) setLoadingConversation(false)
      }
    }

    if (selectedConversationId && profile?.is_trainer) {
      loadConversationInfo()
    }

    return () => { mounted = false }
  }, [selectedConversationId, profile])

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowThread(true)
  }

  const handleBackToList = () => {
    setShowThread(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col">
        <header className="flex-none bg-bg-primary border-b border-border px-4 pt-safe-top pb-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 bg-bg-secondary rounded animate-pulse" />
          </div>
        </header>
        <div className="flex-1">
          <ConversationListSkeleton />
        </div>
        {loadingTimeout && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
            <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-xl max-w-md mx-auto">
              <p className="text-text-secondary text-sm mb-3 text-center">
                Taking longer than expected...
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-primary rounded-lg font-medium text-sm transition-colors"
                >
                  <MaterialIcon name="refresh" size={16} />
                  Refresh
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 px-4 py-2.5 text-text-secondary bg-bg-secondary rounded-lg font-medium text-sm transition-colors"
                >
                  Re-login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="bg-bg-card rounded-2xl border border-border p-8 text-center max-w-md mx-6">
          <div className="text-error text-lg font-semibold mb-4">Profile Not Found</div>
          <p className="text-text-secondary mb-6">{error || 'Your user profile could not be loaded.'}</p>
          <div className="space-y-3">
            <button
              onClick={() => signOut().then(() => router.push('/login'))}
              className="w-full px-6 py-3 text-error bg-error/10 border border-error/20 rounded-lg font-medium"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 text-primary bg-transparent border border-primary rounded-lg font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const isTrainer = profile.is_trainer
  const isClient = profile.is_client && !profile.is_trainer

  // Mobile header component
  const mobileHeader = (
    <header className="flex-none bg-bg-primary sticky top-0 z-50 border-b border-border px-4 pt-safe-top pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center justify-center size-10 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            aria-label="Go back"
          >
            <MaterialIcon name="arrow_back" size={24} />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Messages</h1>
        </div>
        <button
          className="flex items-center justify-center size-10 text-text-secondary"
          aria-label="More options"
        >
          <MaterialIcon name="more_horiz" size={24} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MaterialIcon name="search" size={20} className="text-text-muted" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            placeholder="Search coaches and staff"
          />
        </div>
      </div>
    </header>
  )

  // Get the conversation list based on user type
  const conversationListComponent = isTrainer ? (
    <ConversationList
      currentUserId={user.id}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleSelectConversation}
      searchQuery={searchQuery}
    />
  ) : isClient ? (
    <ClientConversationList
      currentUserId={user.id}
      selectedConversationId={selectedConversationId}
      onSelectConversation={handleSelectConversation}
      searchQuery={searchQuery}
    />
  ) : null

  // Get the active chat component
  const activeChatComponent = (() => {
    if (error) {
      return (
        <div className="h-full flex flex-col bg-bg-primary">
          <div className="flex-none border-b border-border bg-bg-primary pt-safe-top">
            <div className="flex items-center px-4 py-3">
              <button
                onClick={handleBackToList}
                className="p-2 -ml-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
              >
                <MaterialIcon name="arrow_back" size={20} />
              </button>
              <span className="ml-3 text-text-secondary">Error</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-bg-card rounded-2xl border border-border p-8 text-center max-w-md mx-6">
              <div className="text-error text-lg font-semibold mb-4">Error</div>
              <p className="text-text-secondary mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 text-white bg-primary rounded-lg font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (loadingConversation) {
      return (
        <div className="h-full flex flex-col bg-bg-primary">
          <div className="flex-none border-b border-border bg-bg-primary pt-safe-top">
            <div className="flex items-center px-4 py-3">
              <button
                onClick={handleBackToList}
                className="p-2 -ml-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary"
              >
                <MaterialIcon name="arrow_back" size={20} />
              </button>
              <span className="ml-3 text-text-secondary">Loading...</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-secondary text-center">Loading conversation...</div>
          </div>
        </div>
      )
    }

    if (selectedConversationId && conversationInfo) {
      const otherName = isTrainer
        ? conversationInfo.client_name || 'Client'
        : conversationInfo.trainer_name || 'Your Trainer'

      return (
        <ChatWindow
          conversationId={selectedConversationId}
          currentUserId={user.id}
          otherUserName={otherName}
          otherUserAvatar={conversationInfo.avatar_url}
          onBack={handleBackToList}
        />
      )
    }

    return null
  })()

  // Access denied state
  if (!isTrainer && !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-text-secondary text-center">
          <p className="text-lg mb-2">Access Denied</p>
          <p className="text-sm">You need to be a trainer or client to access chat.</p>
        </div>
      </div>
    )
  }

  return (
    <ChatLayout
      mobileHeader={mobileHeader}
      conversationList={conversationListComponent}
      activeChat={activeChatComponent}
      showActiveChat={showThread}
      onSignOut={() => signOut().then(() => router.push('/login'))}
    />
  )
}
