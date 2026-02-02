'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import type { ProfileJoin } from '@/lib/types/database'
import MobileLayout from '@/components/layout/MobileLayout'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { HomePageSkeleton } from '@/components/skeletons/StatsCardSkeleton'
import Image from 'next/image'
import { User, Calendar, Mail, Plus, Users, TrendingUp } from '@/components/ui/icons'

interface Stats {
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalConversations: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  // Use shared unread count hook for real-time message count
  const { unreadCount } = useUnreadCount({
    userId: user?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.is_client,
  })

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
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, client_id')
          .eq('trainer_id', user.id)

        if (!error && conversations) {
          setStats({
            totalConversations: conversations.length,
            clientsCount: conversations.length,
          })
        }
      } else if (profile.is_client) {
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
          const trainerData = conversation.trainer
          const trainer = Array.isArray(trainerData)
            ? trainerData[0] as ProfileJoin | undefined
            : trainerData as ProfileJoin | null
          setStats({
            totalConversations: 1,
            trainerName: trainer?.full_name || 'Coach Mike',
          })
        }
      }

      setLoadingStats(false)
    }

    fetchStats()
  }, [user, profile])

  if (loading) {
    return (
      <MobileLayout>
        <HomePageSkeleton />
      </MobileLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Extract first name from full name
  const firstName = profile.full_name?.split(' ')[0] || 'User'

  // Custom TopBar content for homepage
  const topBarLeftContent = (
    <div className="flex items-center gap-3">
      <div className="relative group cursor-pointer">
        <div
          className="size-11 rounded-full bg-center bg-cover border-[2.5px] border-primary ring-2 ring-primary/20 bg-stone-700"
          style={{
            backgroundImage: profile.avatar_url
              ? `url('${profile.avatar_url}')`
              : undefined
          }}
        >
          {!profile.avatar_url && (
            <div className="size-full rounded-full flex items-center justify-center text-stone-300">
              <User size={22} strokeWidth={2} />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-background-dark"></div>
      </div>
      <div>
        <h2 className="text-lg font-bold leading-tight">Hey, {firstName}!</h2>
        <p className="text-sm text-stone-400 font-medium">Ready to crush it today?</p>
      </div>
    </div>
  )

  return (
    <MobileLayout
      topBarLeftContent={topBarLeftContent}
      notificationCount={unreadCount}
    >
      {/* Brand Logo with Glow */}
      <section className="flex justify-center mb-1 relative">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent pointer-events-none"></div>
        <Image
          src="/Forge-Full-Logo.PNG"
          alt="Forge Sports Performance"
          width={260}
          height={160}
          className="object-contain relative z-10"
          priority
        />
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3 mb-4">
        {/* Schedule Session - Primary Action */}
        <Link
          href="/schedule"
          className="bg-gradient-to-br from-primary via-orange-500 to-amber-600 active:brightness-90 rounded-xl p-5 flex flex-col justify-between min-h-[170px] shadow-lg shadow-orange-900/20 transition-transform active:scale-95 text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="bg-black/20 self-start p-2.5 rounded-xl text-white mb-2 z-10 group-hover:bg-black/30 transition-colors w-12 h-12 flex items-center justify-center">
            <Calendar size={32} strokeWidth={2} />
          </div>
          <div className="z-10">
            <h3 className="text-white text-lg font-bold leading-tight">Schedule<br/>Session</h3>
            <p className="text-black/60 font-bold text-xs mt-1 uppercase tracking-wide">Book Now →</p>
          </div>
        </Link>

        {/* Messages */}
        <Link
          href="/chat"
          className="bg-[#2a2a2a] border border-steel/30 border-l-2 border-l-primary/40 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all active:scale-95 text-left group"
        >
          <div className="flex justify-between items-start w-full">
            <div className={`bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors ${unreadCount > 0 ? 'animate-pulse' : ''}`}>
              <Mail size={28} strokeWidth={2} />
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">Messages</h3>
            <p className="text-stone-400 text-xs mt-1">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : profile.is_client
                  ? `Chat with ${stats.trainerName || 'Coach'}`
                  : 'View Messages'
              }
            </p>
          </div>
        </Link>

        {/* Create Session - Trainer Only */}
        {profile.is_trainer && (
          <Link
            href="/schedule/new"
            className="bg-[#2a2a2a] border border-dashed border-steel/50 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all active:scale-95 text-left group"
          >
            <div className="bg-primary/10 p-2 rounded-lg text-primary group-hover:bg-primary/20 transition-colors self-start">
              <Plus size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold leading-tight">Create Session</h3>
              <p className="text-stone-400 text-xs mt-1">New Class</p>
            </div>
          </Link>
        )}

        {/* My Clients - Trainer Only */}
        {profile.is_trainer && (
          <Link
            href="/chat"
            className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all active:scale-95 text-left group"
          >
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors self-start">
              <Users size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold leading-tight">My Clients</h3>
              <p className="text-2xl font-bold text-primary mt-2">{stats.clientsCount || 0}</p>
              <p className="text-stone-500 text-xs mt-0.5">Active Clients</p>
            </div>
          </Link>
        )}

        {/* My Progress - Client Only */}
        {profile.is_client && (
          <Link
            href="/profile"
            className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[170px] transition-all active:scale-95 text-left group relative overflow-hidden"
          >
            <div className="absolute bottom-0 right-0 w-20 h-20 opacity-5">
              <svg viewBox="0 0 100 50" className="text-primary">
                <polyline
                  points="0,40 20,35 40,25 60,20 80,10 100,5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors self-start z-10">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div className="z-10">
              <h3 className="text-white text-lg font-bold leading-tight">My Progress</h3>
              <p className="text-stone-400 text-xs mt-1">Track Your Gains</p>
            </div>
          </Link>
        )}
      </section>

      {/* Stats Summary Section */}
      {!loadingStats && (
        <section className="flex items-center justify-around py-4 bg-[#232323] rounded-xl border border-white/5">
          {profile.is_trainer ? (
            <>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{stats.clientsCount || 0}</p>
                <p className="text-xs text-stone-500 mt-0.5">Clients</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-bold text-white">{stats.totalConversations}</p>
                <p className="text-xs text-stone-500 mt-0.5">Conversations</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{unreadCount}</p>
                <p className="text-xs text-stone-500 mt-0.5">Unread</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{stats.trainerName || 'Coach'}</p>
                <p className="text-xs text-stone-500 mt-0.5">Your Trainer</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{unreadCount}</p>
                <p className="text-xs text-stone-500 mt-0.5">Unread</p>
              </div>
            </>
          )}
        </section>
      )}
    </MobileLayout>
  )
}
