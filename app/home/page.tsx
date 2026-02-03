'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import type { ProfileJoin } from '@/lib/types/database'
import MobileLayout from '@/components/layout/MobileLayout'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { HomePageSkeleton } from '@/components/skeletons/StatsCardSkeleton'
import Image from 'next/image'
import MaterialIcon from '@/components/ui/MaterialIcon'

interface Stats {
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

interface RecentActivity {
  id: string
  title: string
  subtitle: string
  status: 'COMPLETED' | 'ARCHIVED' | 'UPCOMING'
  icon: string
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const { theme } = useFacilityTheme()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({ totalConversations: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [recentActivity] = useState<RecentActivity[]>([
    { id: '1', title: 'Hitting Lab (Cage 4)', subtitle: 'Yesterday • 1 hour', status: 'COMPLETED', icon: 'sports_baseball' },
    { id: '2', title: 'Strength Training', subtitle: 'Oct 12 • 45 mins', status: 'ARCHIVED', icon: 'fitness_center' },
  ])
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
            trainerName: trainer?.full_name || 'Coach',
          })
        }
      }

      setLoadingStats(false)
    }

    fetchStats()
  }, [user, profile, supabase])

  if (loading) {
    return (
      <MobileLayout hideTopBar>
        <HomePageSkeleton />
      </MobileLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Extract first name from full name
  const firstName = profile.full_name?.split(' ')[0] || 'User'

  // Custom header matching the mockup
  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Avatar */}
        <div className="size-10 rounded-full overflow-hidden bg-bg-secondary border-2 border-border">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.full_name || 'User'}
              width={40}
              height={40}
              className="object-cover size-full"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-text-secondary">
              <MaterialIcon name="person" size={20} />
            </div>
          )}
        </div>

        {/* Facility Branding */}
        <div className="flex flex-col items-center">
          <span className="text-primary font-bold text-base tracking-tight uppercase">
            {theme.name.split(' ')[0] || 'STRIKEZONE'}
          </span>
          <span className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
            {theme.tagline}
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center size-10 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <MaterialIcon name="notifications" size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </header>
  )

  return (
    <MobileLayout customHeader={customHeader}>
      {/* Greeting Section */}
      <section className="mt-2">
        <h1 className="text-2xl font-bold text-text-primary">Hello, {firstName}</h1>
        <p className="text-text-secondary text-sm mt-1">
          Next practice: <span className="text-primary font-semibold">Today @ 4 PM</span>
        </p>
      </section>

      {/* Book Sessions CTA Card */}
      <Link
        href="/schedule"
        className="block bg-primary rounded-2xl p-5 shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
      >
        <h2 className="text-white text-xl font-bold">Book Sessions</h2>
        <p className="text-white/80 text-sm mt-1">Secure your spot in the tunnel</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-white text-text-primary px-4 py-2.5 rounded-full font-semibold text-sm">
          Schedule Now
          <MaterialIcon name="calendar_today" size={18} />
        </div>
      </Link>

      {/* Messages & Payments Grid */}
      <section className="grid grid-cols-2 gap-3">
        {/* Messages Card */}
        <Link
          href="/chat"
          className="bg-bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/30 active:scale-[0.98]"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <MaterialIcon name="chat_bubble" size={24} className="text-primary" />
            </div>
            {unreadCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} NEW
              </span>
            )}
          </div>
          <h3 className="text-text-primary font-semibold">Messages</h3>
          <p className="text-text-secondary text-xs mt-0.5 truncate">
            {unreadCount > 0
              ? `${unreadCount} unread messages`
              : stats.trainerName
                ? `Coach: See you at 4pm!`
                : 'View conversations'
            }
          </p>
        </Link>

        {/* Payments Card */}
        <Link
          href="/payments"
          className="bg-bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/30 active:scale-[0.98]"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="bg-success/10 p-2 rounded-lg">
              <MaterialIcon name="account_balance_wallet" size={24} className="text-success" />
            </div>
          </div>
          <h3 className="text-text-primary font-semibold">Payments</h3>
          <p className="text-text-secondary text-xs mt-0.5">
            Balance: <span className="text-success font-semibold">$0.00</span>
          </p>
        </Link>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-primary font-semibold">Recent Activity</h2>
          <Link href="/schedule?tab=history" className="text-primary text-sm font-medium">
            View All
          </Link>
        </div>

        <div className="space-y-2">
          {recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3"
            >
              <div className="bg-bg-secondary p-2.5 rounded-full">
                <MaterialIcon name={activity.icon} size={22} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-text-primary font-medium text-sm truncate">{activity.title}</h4>
                <p className="text-text-muted text-xs">{activity.subtitle}</p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-1 rounded-md ${
                  activity.status === 'COMPLETED'
                    ? 'bg-success/10 text-success'
                    : 'bg-bg-secondary text-text-muted'
                }`}
              >
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Trainer-specific: My Clients stat */}
      {profile.is_trainer && !loadingStats && (
        <section className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Active Clients</p>
              <p className="text-2xl font-bold text-text-primary">{stats.clientsCount || 0}</p>
            </div>
            <Link
              href="/chat"
              className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              View All
            </Link>
          </div>
        </section>
      )}
    </MobileLayout>
  )
}
