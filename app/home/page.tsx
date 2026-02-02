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

  // Custom TopBar content for homepage
  const topBarLeftContent = (
    <div className="flex items-center gap-3">
      <div className="relative group cursor-pointer">
        <div
          className="size-10 rounded-full bg-center bg-cover border-2 border-primary bg-stone-700"
          style={{
            backgroundImage: profile.avatar_url
              ? `url('${profile.avatar_url}')`
              : undefined
          }}
        >
          {!profile.avatar_url && (
            <div className="size-full rounded-full flex items-center justify-center text-stone-300">
              <User size={20} strokeWidth={2} />
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-background-dark"></div>
      </div>
      <div>
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Welcome back</p>
        <h2 className="text-lg font-bold leading-tight">{profile.full_name || 'User'}</h2>
      </div>
    </div>
  )

  return (
    <MobileLayout
      topBarLeftContent={topBarLeftContent}
      notificationCount={unreadCount}
    >
      {/* Hero Section */}
      <section className="flex flex-col gap-1">
        <Image
          src="/forge-logo.png"
          alt="Forge Sports Performance"
          width={180}
          height={120}
          className="object-contain mb-2"
          priority
        />
        <h1 className="text-2xl font-bold uppercase tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-400">
          Legends aren&apos;t born—they&apos;re <span className="text-primary">forged.</span>
        </h1>
        <p className="text-stone-400 text-sm font-medium mt-2 max-w-[80%]">
          Push past your limits. Your next level awaits.
        </p>
      </section>

      {/* Dashboard Stats */}
      <section className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex-shrink-0 flex-1 min-w-[120px] bg-[#2a2a2a] rounded-xl p-3 border border-stone-700/50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Next Session</p>
          <p className="text-white font-bold text-sm mt-1 truncate">
            {loadingStats ? '...' : 'View Schedule'}
          </p>
        </div>
        <div className="flex-shrink-0 flex-1 min-w-[120px] bg-[#2a2a2a] rounded-xl p-3 border border-stone-700/50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Unread</p>
          <p className="text-white font-bold text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} message${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex-shrink-0 flex-1 min-w-[120px] bg-[#2a2a2a] rounded-xl p-3 border border-stone-700/50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Clients</p>
          <p className="text-white font-bold text-sm mt-1">
            {loadingStats ? '...' : profile.is_trainer ? `${stats.clientsCount || 0} active` : stats.trainerName || 'Coach'}
          </p>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3">
        {/* Schedule Session - Primary Action */}
        <Link
          href="/schedule"
          className="bg-primary active:bg-orange-600 rounded-xl p-5 flex flex-col justify-between min-h-[160px] shadow-lg shadow-orange-900/20 transition-transform active:scale-95 text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="bg-black/20 self-start p-2 rounded-lg text-white mb-2 z-10 group-hover:bg-black/30 transition-colors">
            <Calendar size={28} strokeWidth={2} />
          </div>
          <div className="z-10">
            <h3 className="text-white text-lg font-bold leading-tight">Schedule<br/>Session</h3>
            <p className="text-black/60 font-bold text-xs mt-1 uppercase tracking-wide">Book Now</p>
          </div>
        </Link>

        {/* Messages */}
        <Link
          href="/chat"
          className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all active:scale-95 text-left group"
        >
          <div className="flex justify-between items-start w-full">
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors">
              <Mail size={28} strokeWidth={2} />
            </div>
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">Messages</h3>
            <p className="text-stone-400 text-xs mt-1">
              {loadingStats ? 'Loading...' : stats.trainerName || 'Coach Mike'}
            </p>
          </div>
        </Link>

        {/* Create Session - Trainer Only */}
        {profile.is_trainer && (
          <Link
            href="/schedule/new"
            className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all active:scale-95 text-left group"
          >
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors self-start">
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
            className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all active:scale-95 text-left group"
          >
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors self-start">
              <Users size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold leading-tight">My Clients</h3>
              <p className="text-stone-400 text-xs mt-1">{stats.clientsCount || 0} active</p>
            </div>
          </Link>
        )}

        {/* My Progress - Client Only */}
        {profile.is_client && (
          <Link
            href="/profile"
            className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all active:scale-95 text-left group"
          >
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors self-start">
              <TrendingUp size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-white text-lg font-bold leading-tight">My Progress</h3>
              <p className="text-stone-400 text-xs mt-1">View Stats</p>
            </div>
          </Link>
        )}
      </section>
    </MobileLayout>
  )
}
