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
import { ArrowLeft, Bell, Plus, Search, RefreshCw } from '@/components/ui/icons'

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

  useEffect(() => {
    logger.debug('[ChatPage] Auth state:', {
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      userId: user?.id,
      profileData: profile,
    })
  }, [loading, user, profile])

  // Extended timeout (15 seconds) with graceful degradation
  // Shows skeleton loading first, then offers manual refresh option
  useEffect(() => {
    if (loading) {
      logger.debug('[ChatPage] Setting loading timeout')
      const timeout = setTimeout(() => {
        logger.debug('[ChatPage] Loading timeout reached after 15s')
        setLoadingTimeout(true)
        // Don't set error immediately - just show the timeout UI with refresh option
      }, 15000)

      return () => {
        logger.debug('[ChatPage] Clearing loading timeout')
        clearTimeout(timeout)
      }
    } else {
      setLoadingTimeout(false)
    }
  }, [loading])

  useEffect(() => {
    logger.debug('[ChatPage] Checking auth for redirect:', { loading, hasUser: !!user, hasProfile: !!profile })
    if (!loading && !user) {
      logger.debug('[ChatPage] No user found, redirecting to login')
      setError('No user found. Redirecting to login...')
      router.push('/login')
    } else if (!loading && user && !profile) {
      logger.debug('[ChatPage] User exists but no profile found')
      setError('Profile not found. Please contact support.')
    }
  }, [user, profile, loading])

  useEffect(() => {
    let mounted = true

    const loadClientConversation = async () => {
      logger.debug('[ChatPage] Fetching client conversation for:', user?.id)
      if (!profile || !profile.is_client || profile.is_trainer || !user?.id) {
        logger.debug('[ChatPage] Skipping client conversation fetch - not a client-only user')
        return
      }

      setLoadingConversation(true)
      setError(null)

      try {
        const data = await fetchClientConversation(user.id)
        // Check if still mounted before updating state
        if (!mounted) return

        logger.debug('[ChatPage] Client conversation loaded:', data.id)
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
        // Check if still mounted before updating state
        if (!mounted) return

        logger.error('[ChatPage] Error fetching client conversation:', err)
        const error = err as { code?: string; message?: string }
        if (error.code === 'PGRST116') {
          setError('No conversation found. Please contact support to set up your trainer.')
        } else {
          setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
        }
      } finally {
        if (mounted) {
          setLoadingConversation(false)
        }
      }
    }

    if (profile && profile.is_client && !profile.is_trainer) {
      logger.debug('[ChatPage] Profile is client-only, fetching conversation')
      loadClientConversation()
    }

    return () => {
      mounted = false
    }
  }, [profile, user?.id])

  useEffect(() => {
    let mounted = true

    const loadConversationInfo = async () => {
      logger.debug('[ChatPage] Fetching conversation info for trainer:', selectedConversationId)
      if (!selectedConversationId || !profile?.is_trainer) {
        logger.debug('[ChatPage] Skipping trainer conversation fetch')
        return
      }

      setLoadingConversation(true)
      setError(null)

      try {
        const data = await fetchConversationById(selectedConversationId, true)
        // Check if still mounted before updating state
        if (!mounted) return

        logger.debug('[ChatPage] Trainer conversation loaded:', data.id)
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
        // Check if still mounted before updating state
        if (!mounted) return

        logger.error('[ChatPage] Error fetching conversation info:', err)
        const error = err as { message?: string }
        setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
      } finally {
        if (mounted) {
          setLoadingConversation(false)
        }
      }
    }

    if (selectedConversationId && profile?.is_trainer) {
      logger.debug('[ChatPage] Selected conversation changed, fetching info')
      loadConversationInfo()
    }

    return () => {
      mounted = false
    }
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
      <div className="min-h-screen bg-background-dark flex flex-col">
        {/* Show skeleton loading with optional refresh after timeout */}
        <header className="flex-none bg-background-dark border-b border-white/10 px-4 pt-safe-top pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-stone-700 animate-pulse" />
              <div className="h-7 w-24 bg-stone-700 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="flex-1">
          <ConversationListSkeleton />
        </div>
        {loadingTimeout && (
          <div className="fixed bottom-20 left-0 right-0 px-4 z-50">
            <div className="bg-[#2C2C2C] border border-steel/30 rounded-xl p-4 shadow-xl max-w-md mx-auto">
              <p className="text-stone-300 text-sm mb-3 text-center">
                Taking longer than expected...
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-primary rounded-lg hover:bg-orange-600 font-medium text-sm transition-colors"
                >
                  <RefreshCw size={16} strokeWidth={2} />
                  Refresh
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="flex-1 px-4 py-2.5 text-stone-300 bg-stone-700 rounded-lg hover:bg-stone-600 font-medium text-sm transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-lg font-semibold mb-4">Profile Not Found</div>
          <p className="text-stone-400 mb-6">{error || 'Your user profile could not be loaded. Please contact support.'}</p>
          <div className="space-y-3">
            <button
              onClick={() => signOut().then(() => router.push('/login'))}
              className="w-full px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-500 font-medium"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 text-primary bg-transparent border border-primary rounded-lg hover:bg-primary/10 font-medium"
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
    <header className="flex-none bg-background-dark sticky top-0 z-50 border-b border-white/10 px-4 pt-safe-top pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] -ml-2 rounded-full hover:bg-white/5 transition-colors text-white active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={28} strokeWidth={2} />
          </button>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-white">Comms</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/5 transition-colors relative active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={24} strokeWidth={2} className="text-primary" />
            <span className="absolute top-1.5 right-1.5 size-2.5 bg-gold rounded-full ring-2 ring-background-dark"></span>
          </button>
          <button
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] bg-primary hover:bg-orange-600 transition-colors rounded-full shadow-lg shadow-primary/20 active:scale-95"
            aria-label="New conversation"
          >
            <Plus size={24} strokeWidth={2} className="text-white" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={20} strokeWidth={2} className="text-stone-500 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border-none rounded-lg leading-5 bg-[#2C2C2C] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-[#333] transition-all text-sm"
            placeholder="Search conversations..."
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
    />
  ) : null

  // Get the active chat component
  const activeChatComponent = (() => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <div className="text-red-500 text-lg font-semibold mb-4">Error</div>
            <p className="text-stone-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-white bg-primary rounded-lg hover:bg-orange-600 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    if (loadingConversation) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-stone-500 text-center">Loading conversation...</div>
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
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-stone-500 text-center">
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
      onCloseActiveChat={handleBackToList}
      onSignOut={() => signOut().then(() => router.push('/login'))}
    />
  )
}
