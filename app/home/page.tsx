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
import { User, Flame, Calendar, Mail, Dumbbell, CheckCircle, Trophy, Plus } from '@/components/ui/icons'

interface Stats {
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

type ActivityIconKey = "checkCircle" | "trophy" | "dumbbell" | "flame"

interface ActivityItem {
  id: string
  title: string
  timestamp: string
  iconKey: ActivityIconKey
  iconColor: string
  xp?: number
}

function ActivityIcon({ iconKey, size, strokeWidth }: { iconKey: ActivityIconKey; size: number; strokeWidth: number }) {
  switch (iconKey) {
    case "checkCircle":
      return <CheckCircle size={size} strokeWidth={strokeWidth} />;
    case "trophy":
      return <Trophy size={size} strokeWidth={strokeWidth} />;
    case "dumbbell":
      return <Dumbbell size={size} strokeWidth={strokeWidth} />;
    case "flame":
      return <Flame size={size} strokeWidth={strokeWidth} />;
  }
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

  const [recentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      title: 'Upper Body Hypertrophy',
      timestamp: 'Yesterday, 5:30 PM • 1h 15m',
      iconKey: 'checkCircle',
      iconColor: 'text-white',
      xp: 350,
    },
    {
      id: '2',
      title: 'New PR: Deadlift',
      timestamp: 'Oct 24 • 405 lbs',
      iconKey: 'trophy',
      iconColor: 'text-gold',
    },
  ])

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
        <h1 className="text-4xl font-bold uppercase tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-500">
          Legends aren&apos;t<br /> born—they&apos;re<br /> <span className="text-primary">forged.</span>
        </h1>
        <p className="text-stone-400 text-sm font-medium mt-2 max-w-[80%]">
          Push past your limits. Your next level awaits.
        </p>
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
      </section>

      {/* Recent Activity Feed */}
      <section className="flex flex-col gap-3 pb-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-white tracking-tight">Recent Activity</h3>
          <Link href="/activity" className="text-primary text-sm font-medium hover:text-orange-400">
            View All
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-4 bg-[#23160f] border border-steel/20 p-4 rounded-xl"
            >
              <div className={`size-12 rounded-full bg-stone-800 flex items-center justify-center shrink-0 ${activity.iconColor}`}>
                <ActivityIcon iconKey={activity.iconKey} size={24} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold truncate">{activity.title}</h4>
                <p className="text-stone-500 text-xs mt-0.5">{activity.timestamp}</p>
              </div>
              {activity.xp && (
                <div className="text-primary font-bold text-sm">
                  +{activity.xp} XP
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </MobileLayout>
  )
}
