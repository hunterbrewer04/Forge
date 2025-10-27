'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import ConversationList from './components/ConversationList'
import ChatWindow from './components/ChatWindow'

interface ConversationInfo {
  id: string
  client_id: string
  trainer_id: string
  client_name: string | null
  trainer_name: string | null
}

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const supabase = createClient()

  // Debug logging on mount
  useEffect(() => {
    console.log('[ChatPage] Component mounted')
  }, [])

  // Debug logging for auth state
  useEffect(() => {
    console.log('[ChatPage] Auth state:', {
      loading,
      hasUser: !!user,
      hasProfile: !!profile,
      userId: user?.id,
      profileData: profile,
    })
  }, [loading, user, profile])

  // Loading timeout - if stuck loading for more than 5 seconds, show error
  useEffect(() => {
    if (loading) {
      console.log('[ChatPage] Setting loading timeout')
      const timeout = setTimeout(() => {
        console.log('[ChatPage] Loading timeout reached!')
        setLoadingTimeout(true)
        setError('Authentication is taking too long. Please refresh the page or try logging in again.')
      }, 5000)

      return () => {
        console.log('[ChatPage] Clearing loading timeout')
        clearTimeout(timeout)
      }
    } else {
      setLoadingTimeout(false)
    }
  }, [loading])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    console.log('[ChatPage] Checking auth for redirect:', { loading, hasUser: !!user, hasProfile: !!profile })
    if (!loading && !user) {
      console.log('[ChatPage] No user found, redirecting to login')
      setError('No user found. Redirecting to login...')
      router.push('/login')
    } else if (!loading && user && !profile) {
      console.log('[ChatPage] User exists but no profile found')
      setError('Profile not found. Please contact support.')
    }
  }, [user, profile, loading, router])

  // For clients, automatically fetch their conversation with their trainer
  useEffect(() => {
    const fetchClientConversation = async () => {
      console.log('[ChatPage] Fetching client conversation for:', user?.id)
      if (!profile || !profile.is_client || profile.is_trainer) {
        console.log('[ChatPage] Skipping client conversation fetch - not a client-only user')
        return
      }

      setLoadingConversation(true)
      setError(null)

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          client_id,
          trainer_id,
          trainer:profiles!conversations_trainer_id_fkey (
            full_name
          )
        `)
        .eq('client_id', user?.id)
        .single()

      if (error) {
        console.error('[ChatPage] Error fetching client conversation:', error)
        if (error.code === 'PGRST116') {
          // No rows returned
          setError('No conversation found. Please contact support to set up your trainer.')
        } else {
          setError(`Failed to load conversation: ${error.message}`)
        }
        setLoadingConversation(false)
        return
      }

      if (data) {
        console.log('[ChatPage] Client conversation loaded:', data.id)
        const convInfo: ConversationInfo = {
          id: data.id,
          client_id: data.client_id,
          trainer_id: data.trainer_id,
          client_name: profile.full_name,
          trainer_name: (data.trainer as any)?.full_name || 'Your Trainer',
        }
        setConversationInfo(convInfo)
        setSelectedConversationId(data.id)
      } else {
        console.log('[ChatPage] No conversation data returned')
        setError('No conversation found. Please contact support.')
      }

      setLoadingConversation(false)
    }

    if (profile && profile.is_client && !profile.is_trainer) {
      console.log('[ChatPage] Profile is client-only, fetching conversation')
      fetchClientConversation()
    }
  }, [profile, user?.id, supabase])

  // Fetch conversation info when a conversation is selected (for trainers)
  useEffect(() => {
    const fetchConversationInfo = async () => {
      console.log('[ChatPage] Fetching conversation info for trainer:', selectedConversationId)
      if (!selectedConversationId || !profile?.is_trainer) {
        console.log('[ChatPage] Skipping trainer conversation fetch')
        return
      }

      setLoadingConversation(true)
      setError(null)

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          client_id,
          trainer_id,
          client:profiles!conversations_client_id_fkey (
            full_name
          )
        `)
        .eq('id', selectedConversationId)
        .single()

      if (error) {
        console.error('[ChatPage] Error fetching conversation info:', error)
        setError(`Failed to load conversation: ${error.message}`)
        setLoadingConversation(false)
        return
      }

      if (data) {
        console.log('[ChatPage] Trainer conversation loaded:', data.id)
        const convInfo: ConversationInfo = {
          id: data.id,
          client_id: data.client_id,
          trainer_id: data.trainer_id,
          client_name: (data.client as any)?.full_name || 'Client',
          trainer_name: profile.full_name,
        }
        setConversationInfo(convInfo)
      } else {
        console.log('[ChatPage] No conversation data returned')
        setError('Conversation not found.')
      }

      setLoadingConversation(false)
    }

    if (selectedConversationId && profile?.is_trainer) {
      console.log('[ChatPage] Selected conversation changed, fetching info')
      fetchConversationInfo()
    }
  }, [selectedConversationId, profile, supabase])

  // Show loading state or timeout error
  if (loading || loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          {loadingTimeout ? (
            <>
              <div className="text-red-600 text-lg font-semibold mb-4">Loading Timeout</div>
              <p className="text-gray-700 mb-6">{error}</p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-500 font-medium"
                >
                  Refresh Page
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-6 py-3 text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
                >
                  Go to Login
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-gray-600 text-lg mb-2">Loading...</div>
              <div className="text-gray-400 text-sm">Checking authentication</div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Show error if user exists but no profile
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-red-600 text-lg font-semibold mb-4">Profile Not Found</div>
          <p className="text-gray-700 mb-6">{error || 'Your user profile could not be loaded. Please contact support.'}</p>
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-500 font-medium"
            >
              Sign Out
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to login if no user (shouldn't reach here, but safety check)
  if (!user) {
    return null
  }

  const isTrainer = profile.is_trainer
  const isClient = profile.is_client && !profile.is_trainer

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Forge Chat</h1>
          <p className="text-xs text-gray-500">{profile.full_name || 'User'}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500"
        >
          Sign Out
        </button>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex overflow-hidden">
        {isTrainer ? (
          <>
            {/* Trainer view: Sidebar + Chat Window */}
            <div className="w-full sm:w-80 flex-shrink-0">
              <ConversationList
                currentUserId={user.id}
                selectedConversationId={selectedConversationId}
                onSelectConversation={setSelectedConversationId}
              />
            </div>
            <div className="flex-1 flex flex-col">
              {selectedConversationId && conversationInfo ? (
                <ChatWindow
                  conversationId={selectedConversationId}
                  currentUserId={user.id}
                  otherUserName={conversationInfo.client_name || 'Client'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-gray-500 text-center">
                    {loadingConversation ? (
                      'Loading conversation...'
                    ) : (
                      <>
                        <p className="text-lg mb-2">Select a conversation</p>
                        <p className="text-sm">Choose a client from the sidebar to start chatting</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : isClient ? (
          <>
            {/* Client view: Just Chat Window */}
            <div className="flex-1 flex flex-col w-full">
              {error ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center max-w-md px-6">
                    <div className="text-red-600 text-lg font-semibold mb-4">Error</div>
                    <p className="text-gray-700 mb-6">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-500 font-medium"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : selectedConversationId && conversationInfo ? (
                <ChatWindow
                  conversationId={selectedConversationId}
                  currentUserId={user.id}
                  otherUserName={conversationInfo.trainer_name || 'Your Trainer'}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-gray-500 text-center px-6">
                    {loadingConversation ? (
                      <>
                        <div className="text-lg mb-2">Loading your conversation...</div>
                        <div className="text-sm text-gray-400">This should only take a moment</div>
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-gray-500 text-center">
              <p className="text-lg mb-2">Access Denied</p>
              <p className="text-sm">You need to be a trainer or client to access chat.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
