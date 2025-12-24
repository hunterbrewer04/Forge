'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import type { ProfileJoin } from '@/lib/types/database'

interface Stats {
  unreadCount: number
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

export default function HomePage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ unreadCount: 0, totalConversations: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch user stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile) return

      setLoadingStats(true)

      if (profile.is_trainer) {
        // Fetch trainer stats
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, client_id')
          .eq('trainer_id', user.id)

        if (!error && conversations) {
          setStats({
            unreadCount: 0, // You can implement unread count logic later
            totalConversations: conversations.length,
            clientsCount: conversations.length,
          })
        }
      } else if (profile.is_client) {
        // Fetch client stats - get trainer name
        const { data: conversation, error } = await supabase
          .from('conversations')
          .select(`
            id,
            trainer:profiles!conversations_trainer_id_fkey (
              full_name
            )
          `)
          .eq('client_id', user.id)
          .single()

        if (!error && conversation) {
          // Supabase returns object for single FK relations, but TS infers array
          // Handle both cases defensively
          const trainerData = conversation.trainer
          const trainer = Array.isArray(trainerData)
            ? trainerData[0] as ProfileJoin | undefined
            : trainerData as ProfileJoin | null
          setStats({
            unreadCount: 0, // You can implement unread count logic later
            totalConversations: 1,
            trainerName: trainer?.full_name || 'Your Trainer',
          })
        }
      }

      setLoadingStats(false)
    }

    fetchStats()
  }, [user, profile, supabase])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const isTrainer = profile.is_trainer
  const isClient = profile.is_client && !profile.is_trainer

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forge</h1>
            <p className="text-sm text-gray-500">Welcome back, {profile.full_name || 'User'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {profile.full_name || 'User'}!
          </h2>
          <p className="text-gray-600">
            {isTrainer
              ? "Manage your client conversations and track their progress."
              : "Connect with your trainer and track your fitness journey."}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Messages Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">💬</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-500">
                  {isTrainer ? 'Client Conversations' : 'Your Conversation'}
                </p>
              </div>
            </div>
            {loadingStats ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalConversations}
                {isTrainer ? ` Client${stats.totalConversations !== 1 ? 's' : ''}` : ' Trainer'}
              </div>
            )}
            <Link
              href="/chat"
              className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
            >
              Open Messages
            </Link>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="text-3xl mr-3">
                {isTrainer ? '👥' : '💪'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isTrainer ? 'Your Clients' : 'Your Trainer'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isTrainer ? 'Active training relationships' : 'Your fitness coach'}
                </p>
              </div>
            </div>
            {loadingStats ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {isTrainer
                  ? `${stats.clientsCount || 0} Active`
                  : stats.trainerName || 'Not assigned'}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/chat"
              className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="text-2xl mr-3">💬</div>
              <div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                  View Messages
                </div>
                <div className="text-sm text-gray-500">
                  {isTrainer ? 'Chat with your clients' : 'Message your trainer'}
                </div>
              </div>
            </Link>

            <button
              onClick={() => {
                if (window.matchMedia('(display-mode: standalone)').matches) {
                  alert('App is already installed!')
                } else {
                  alert('Look for the install prompt at the bottom of the screen, or use your browser\'s menu to install this app.')
                }
              }}
              className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group text-left"
            >
              <div className="text-2xl mr-3">📱</div>
              <div>
                <div className="font-semibold text-gray-900 group-hover:text-green-600">
                  Install App
                </div>
                <div className="text-sm text-gray-500">
                  Add to your home screen
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Forge Trainer - Your fitness communication platform</p>
        </div>
      </div>
    </div>
  )
}
