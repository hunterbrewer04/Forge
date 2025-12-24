'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import type { ProfileJoin } from '@/lib/types/database'
import MobileLayout from '@/components/layout/MobileLayout'

interface Stats {
  unreadCount: number
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

interface ActivityItem {
  id: string
  title: string
  timestamp: string
  icon: string
  iconColor: string
  xp?: number
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ unreadCount: 0, totalConversations: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const supabase = createClient()

  // Mock data for demo - replace with real data later
  const [streak] = useState(12)
  const [classLevel] = useState({ name: 'Elite Class', progress: 75 })
  const [recentActivity] = useState<ActivityItem[]>([
    {
      id: '1',
      title: 'Upper Body Hypertrophy',
      timestamp: 'Yesterday, 5:30 PM • 1h 15m',
      icon: 'check_circle',
      iconColor: 'text-white',
      xp: 350,
    },
    {
      id: '2',
      title: 'New PR: Deadlift',
      timestamp: 'Oct 24 • 405 lbs',
      icon: 'emoji_events',
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
            unreadCount: 2, // Mock unread count
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
            unreadCount: 2, // Mock unread count
            totalConversations: 1,
            trainerName: trainer?.full_name || 'Coach Mike',
          })
        }
      }

      setLoadingStats(false)
    }

    fetchStats()
  }, [user, profile, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-stone-400">Loading...</div>
      </div>
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
              <span className="material-symbols-outlined text-[20px]">person</span>
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
      notificationCount={stats.unreadCount}
      onFabClick={() => router.push('/schedule')}
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

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-3">
        {/* Current Streak */}
        <div className="bg-gradient-to-br from-[#2a2a2a] to-[#202020] border border-steel/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[48px] text-gold">local_fire_department</span>
          </div>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Current Streak</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-gold">{streak}</span>
            <span className="text-sm font-medium text-gold/80">Days</span>
          </div>
        </div>

        {/* Class Level */}
        <div className="bg-gradient-to-br from-[#2a2a2a] to-[#202020] border border-steel/30 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[48px] text-stone-200">military_tech</span>
          </div>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider">Class Level</p>
          <div className="mt-1">
            <span className="text-xl font-bold text-white">{classLevel.name}</span>
            <div className="w-full h-1 bg-stone-700 rounded-full mt-2">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${classLevel.progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3">
        {/* Schedule Session - Primary Action */}
        <Link
          href="/schedule"
          className="col-span-1 row-span-1 bg-primary active:bg-orange-600 rounded-xl p-5 flex flex-col justify-between min-h-[140px] shadow-lg shadow-orange-900/20 transition-transform active:scale-95 text-left group relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          <div className="bg-black/20 self-start p-2 rounded-lg text-white mb-2 z-10 group-hover:bg-black/30 transition-colors">
            <span className="material-symbols-outlined text-[28px]">calendar_month</span>
          </div>
          <div className="z-10">
            <h3 className="text-white text-lg font-bold leading-tight">Schedule<br/>Session</h3>
            <p className="text-black/60 font-bold text-xs mt-1 uppercase tracking-wide">Book Now</p>
          </div>
        </Link>

        {/* Messages */}
        <Link
          href="/chat"
          className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[140px] transition-all active:scale-95 text-left group"
        >
          <div className="flex justify-between items-start w-full">
            <div className="bg-stone-800 p-2 rounded-lg text-white group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[28px]">mail</span>
            </div>
            {stats.unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {stats.unreadCount} NEW
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

        {/* My Stats */}
        <Link
          href="/stats"
          className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[140px] transition-all active:scale-95 text-left group"
        >
          <div className="bg-stone-800 self-start p-2 rounded-lg text-white mb-2 group-hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[28px]">monitoring</span>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">My Stats</h3>
            <p className="text-stone-400 text-xs mt-1">+5% vs Last Wk</p>
          </div>
        </Link>

        {/* Workout */}
        <Link
          href="/workout"
          className="bg-[#2a2a2a] border border-steel/30 active:border-primary/50 active:bg-[#333] rounded-xl p-5 flex flex-col justify-between min-h-[140px] transition-all active:scale-95 text-left group relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none translate-x-2 translate-y-2">
            <span className="material-symbols-outlined text-[100px]">fitness_center</span>
          </div>
          <div className="bg-stone-800 self-start p-2 rounded-lg text-white mb-2 group-hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[28px]">fitness_center</span>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold leading-tight">Workout</h3>
            <p className="text-primary text-xs mt-1 font-bold">Next: Leg Day</p>
          </div>
        </Link>
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
                <span className="material-symbols-outlined">{activity.icon}</span>
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
