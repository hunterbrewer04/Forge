'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ConversationList from './components/ConversationList'
import ClientConversationList from './components/ClientConversationList'
import ChatWindow from './components/ChatWindow'
import { logger } from '@/lib/utils/logger'
import { fetchClientConversation, fetchConversationById } from '@/lib/services/conversations'

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

  useEffect(() => {
    if (loading) {
      logger.debug('[ChatPage] Setting loading timeout')
      const timeout = setTimeout(() => {
        logger.debug('[ChatPage] Loading timeout reached!')
        setLoadingTimeout(true)
        setError('Authentication is taking too long. Please refresh the page or try logging in again.')
      }, 5000)

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
  }, [user, profile, loading, router])

  useEffect(() => {
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
        logger.error('[ChatPage] Error fetching client conversation:', err)
        const error = err as { code?: string; message?: string }
        if (error.code === 'PGRST116') {
          setError('No conversation found. Please contact support to set up your trainer.')
        } else {
          setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
        }
      } finally {
        setLoadingConversation(false)
      }
    }

    if (profile && profile.is_client && !profile.is_trainer) {
      logger.debug('[ChatPage] Profile is client-only, fetching conversation')
      loadClientConversation()
    }
  }, [profile, user?.id])

  useEffect(() => {
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
        logger.error('[ChatPage] Error fetching conversation info:', err)
        const error = err as { message?: string }
        setError(`Failed to load conversation: ${error.message || 'Unknown error'}`)
      } finally {
        setLoadingConversation(false)
      }
    }

    if (selectedConversationId && profile?.is_trainer) {
      logger.debug('[ChatPage] Selected conversation changed, fetching info')
      loadConversationInfo()
    }
  }, [selectedConversationId, profile])

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowThread(true)
  }

  const handleBackToList = () => {
    setShowThread(false)
  }

  if (loading || loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center max-w-md px-6">
          {loadingTimeout ? (
            <>
              <div className="text-red-500 text-lg font-semibold mb-4">Loading Timeout</div>
              <p className="text-stone-400 mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 text-white bg-primary rounded-lg hover:bg-orange-600 font-medium"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-6 py-3 text-primary bg-transparent border border-primary rounded-lg hover:bg-primary/10 font-medium"
                >
                  Go to Login
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-stone-400 text-lg mb-2">Loading...</div>
              <div className="text-stone-500 text-sm">Checking authentication</div>
            </>
          )}
        </div>
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

  return (
    <div className="h-screen flex flex-col bg-background-dark overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-background-dark sticky top-0 z-50 border-b border-white/10 px-4 pt-safe-top pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors text-white"
            >
              <span className="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-white">Comms</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full hover:bg-white/5 transition-colors relative">
              <span className="material-symbols-outlined text-primary">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-gold rounded-full border border-background-dark"></span>
            </button>
            <button className="flex items-center justify-center size-10 bg-primary hover:bg-orange-600 transition-colors rounded-full shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white">add</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-stone-500 group-focus-within:text-primary transition-colors">search</span>
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative w-full max-w-2xl mx-auto">
        {isTrainer ? (
          <>
            {/* Trainer view: List or Thread based on showThread state */}
            <div className={`h-full ${showThread ? 'hidden sm:block sm:w-80' : 'block'}`}>
              <ConversationList
                currentUserId={user.id}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
                searchQuery={searchQuery}
              />
            </div>
            {showThread && selectedConversationId && conversationInfo ? (
              <div className="absolute inset-0 bg-background-dark z-20 flex flex-col sm:relative sm:flex-1">
                <ChatWindow
                  conversationId={selectedConversationId}
                  currentUserId={user.id}
                  otherUserName={conversationInfo.client_name || 'Client'}
                  otherUserAvatar={conversationInfo.avatar_url}
                  onBack={handleBackToList}
                />
              </div>
            ) : !showThread ? null : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-stone-500 text-center">
                  {loadingConversation ? 'Loading conversation...' : 'Select a conversation'}
                </div>
              </div>
            )}
          </>
        ) : isClient ? (
          <>
            {/* Client view: List or Thread */}
            <div className={`h-full ${showThread ? 'hidden sm:block sm:w-80' : 'block'}`}>
              <ClientConversationList
                currentUserId={user.id}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
              />
            </div>
            {error ? (
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
            ) : showThread && selectedConversationId && conversationInfo ? (
              <div className="absolute inset-0 bg-background-dark z-20 flex flex-col sm:relative sm:flex-1">
                <ChatWindow
                  conversationId={selectedConversationId}
                  currentUserId={user.id}
                  otherUserName={conversationInfo.trainer_name || 'Your Trainer'}
                  otherUserAvatar={conversationInfo.avatar_url}
                  onBack={handleBackToList}
                />
              </div>
            ) : !showThread ? null : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-stone-500 text-center px-6">
                  {loadingConversation ? (
                    <>
                      <div className="text-lg mb-2">Loading your conversation...</div>
                      <div className="text-sm text-stone-600">This should only take a moment</div>
                    </>
                  ) : (
                    <>
                      <p className="text-lg mb-2">No conversation found</p>
                      <p className="text-sm">Please contact support to set up your trainer.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-stone-500 text-center">
              <p className="text-lg mb-2">Access Denied</p>
              <p className="text-sm">You need to be a trainer or client to access chat.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
