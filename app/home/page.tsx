'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import type { ProfileJoin } from '@/lib/types/database'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { useHomeData } from '@/lib/hooks/useHomeData'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { HomePageSkeleton } from '@/components/skeletons/StatsCardSkeleton'
import Image from 'next/image'
import { User, Bell, Calendar, MessageCircle, Wallet, Dumbbell, CalendarOff } from '@/components/ui/icons'
import { fetchRecentInvoices } from '@/lib/services/payments'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

interface Stats {
  totalConversations: number
  trainerName?: string
  clientsCount?: number
}

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const { theme } = useFacilityTheme()
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [stats, setStats] = useState<Stats>({ totalConversations: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  // Fetch real home data — pass userId to avoid redundant getUser() call
  const { nextSession, recentActivity, loading: loadingHomeData } = useHomeData(user?.id)

  // Use shared unread count hook for real-time message count
  const { unreadCount } = useUnreadCount({
    userId: user?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.has_full_access,
  })

  // Fetch recent payments for the Payments card
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => fetchRecentInvoices(3),
    enabled: !!user,
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  // Fetch user stats (only for users with messaging access)
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile) return
      if (!profile.is_trainer && !profile.has_full_access) {
        setLoadingStats(false)
        return
      }

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
      } else if (profile.has_full_access) {
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
      <GlassAppLayout hideTopBar hideDesktopHeader>
        <HomePageSkeleton />
      </GlassAppLayout>
    )
  }

  if (!user) {
    return null
  }

  if (!profile) {
    return (
      <GlassAppLayout hideTopBar hideDesktopHeader>
        <HomePageSkeleton />
      </GlassAppLayout>
    )
  }

  // Extract first name from full name
  const firstName = profile.full_name?.split(' ')[0] || 'User'

  // Format next session time
  const formatNextSessionTime = () => {
    if (!nextSession?.start_time) return null

    const sessionDate = new Date(nextSession.start_time)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
    const diffDays = Math.floor((sessionDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const time = sessionDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    if (diffDays === 0) {
      return `Today @ ${time}`
    } else if (diffDays === 1) {
      return `Tomorrow @ ${time}`
    } else if (diffDays <= 7) {
      const dayName = sessionDate.toLocaleDateString('en-US', { weekday: 'long' })
      return `${dayName} @ ${time}`
    } else {
      const dateStr = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `${dateStr} @ ${time}`
    }
  }

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
              <User size={20} />
            </div>
          )}
        </div>

        {/* Facility Branding */}
        <div className="flex flex-col items-center">
          <span className="text-primary font-bold text-base tracking-tight uppercase">
            {theme.name.split(' ')[0] || 'FORGE'}
          </span>
          <span className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
            {theme.tagline}
          </span>
        </div>

        {/* Notifications */}
        <button
          onClick={() => router.push('/profile/notifications')}
          className="relative flex items-center justify-center size-10 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
          )}
        </button>
      </div>
    </header>
  )

  // Shared recent activity renderer used in both mobile and desktop layouts
  const renderRecentActivityItems = () => {
    if (loadingHomeData) {
      return (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3 animate-pulse"
            >
              <div className="bg-bg-secondary size-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-bg-secondary rounded w-3/4 mb-1" />
                <div className="h-3 bg-bg-secondary rounded w-1/2" />
              </div>
              <div className="h-6 w-16 bg-bg-secondary rounded" />
            </div>
          ))}
        </div>
      )
    }

    if (recentActivity.length > 0) {
      return (
        <div className="space-y-2">
          {recentActivity.map((activity) => {
            const activityDate = new Date(activity.completed_at)
            const now = new Date()
            const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24))

            let timeAgo = ''
            if (diffDays === 0) {
              timeAgo = 'Today'
            } else if (diffDays === 1) {
              timeAgo = 'Yesterday'
            } else if (diffDays < 7) {
              timeAgo = `${diffDays} days ago`
            } else {
              timeAgo = activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3"
              >
                <div className="bg-bg-secondary p-2.5 rounded-full">
                  <Dumbbell size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-text-primary font-medium text-sm truncate">{activity.title}</h4>
                  <p className="text-text-muted text-xs">
                    {timeAgo}
                    {activity.trainer_name && ` • ${activity.trainer_name}`}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-success/10 text-success">
                  COMPLETED
                </span>
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center bg-bg-card border border-border rounded-xl p-8 text-center">
        <div className="bg-bg-secondary p-4 rounded-full mb-3">
          <CalendarOff size={32} className="text-text-muted" />
        </div>
        <h3 className="text-text-primary font-medium mb-1">No Recent Activity</h3>
        <p className="text-text-secondary text-sm mb-4">
          Your completed sessions will appear here
        </p>
        <Link
          href="/schedule"
          className="text-primary text-sm font-semibold hover:underline"
        >
          Book Your First Session
        </Link>
      </div>
    )
  }

  return (
    <GlassAppLayout customHeader={customHeader} hideDesktopHeader>
      {isDesktop ? (
        /* ── Desktop layout ── */
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
          {/* Desktop greeting header card */}
          <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="size-14 rounded-full overflow-hidden bg-bg-secondary border-2 border-border shrink-0">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User'}
                      width={56}
                      height={56}
                      className="object-cover size-full"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-text-secondary">
                      <User size={24} />
                    </div>
                  )}
                </div>
                {/* Greeting text */}
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Hello, {firstName}</h1>
                  <p className="text-text-secondary text-sm mt-0.5">
                    {loadingHomeData ? (
                      <span>Loading next session...</span>
                    ) : nextSession ? (
                      <>
                        Next session:{' '}
                        <span className="text-primary font-semibold">{formatNextSessionTime()}</span>
                      </>
                    ) : (
                      <span>No upcoming sessions scheduled</span>
                    )}
                  </p>
                </div>
              </div>
              {/* Facility branding + notifications */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-primary font-bold text-base tracking-tight uppercase">
                    {theme.name.split(' ')[0] || 'FORGE'}
                  </span>
                  <span className="text-text-muted text-[10px] font-medium tracking-wider uppercase">
                    {theme.tagline}
                  </span>
                </div>
                <button
                  onClick={() => router.push('/profile/notifications')}
                  className="relative flex items-center justify-center size-10 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
                  )}
                </button>
              </div>
            </div>
          </GlassCard>
          </motion.div>

          {/* Main 5-column grid: 3 left + 2 right */}
          <motion.div variants={fadeUpItem}>
          <div className="grid grid-cols-5 gap-6 items-start">
            {/* Left column — 3 cols */}
            <div className="col-span-3 space-y-4">
              {/* Book Sessions CTA */}
              <GlassCard
                variant="subtle"
                className="p-6 overflow-hidden"
                interactive
              >
                <Link
                  href="/schedule"
                  className="block"
                  style={{
                    background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    display: 'block',
                  }}
                >
                  <h2 className="text-white text-xl font-bold">Book Sessions</h2>
                  <p className="text-white/70 text-sm mt-1">
                    Browse available training slots and reserve your spot.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 bg-white text-text-primary px-4 py-2.5 rounded-full font-semibold text-sm">
                    Schedule Now
                    <Calendar size={18} />
                  </div>
                </Link>
              </GlassCard>

              {/* Recent Activity */}
              <GlassCard variant="subtle" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-text-primary font-semibold text-base">Recent Activity</h2>
                  <Link href="/profile/history" className="text-primary text-sm font-medium hover:underline">
                    View All
                  </Link>
                </div>
                {renderRecentActivityItems()}
              </GlassCard>
            </div>

            {/* Right column — 2 cols */}
            <div className="col-span-2 space-y-4">
              {/* Messages Card — only for trainers and full-access users */}
              {(profile.is_trainer || profile.has_full_access) && (
                <GlassCard
                  variant="subtle"
                  className="p-6"
                  interactive
                >
                  <Link href="/chat" className="block">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <MessageCircle size={24} className="text-primary" />
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
                          ? `Chat with ${stats.trainerName}`
                          : 'View conversations'}
                    </p>
                  </Link>
                </GlassCard>
              )}

              {/* Payments Card */}
              <GlassCard
                variant="subtle"
                className="p-6"
                interactive
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-success/10 p-2 rounded-lg">
                    <Wallet size={24} className="text-success" />
                  </div>
                  <Link href="/payments" className="text-primary text-sm font-medium hover:underline">
                    View All
                  </Link>
                </div>
                <h3 className="text-text-primary font-semibold mb-3">Payments</h3>
                {recentPayments && recentPayments.length > 0 ? (
                  <div className="space-y-2">
                    {recentPayments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary truncate mr-2">
                          {new Date(inv.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-text-primary font-medium">
                          ${(inv.amount_paid / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-xs">
                    Manage billing &amp; payments
                  </p>
                )}
              </GlassCard>

              {/* Trainer-specific: Active Clients stat */}
              {profile.is_trainer && !loadingStats && (
                <GlassCard variant="subtle" className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm">Active Clients</p>
                      <p className="text-2xl font-bold text-text-primary">{stats.clientsCount || 0}</p>
                    </div>
                    <Link
                      href="/trainer/clients"
                      className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                    >
                      View All
                    </Link>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
          </motion.div>
        </motion.div>
      ) : (
        /* ── Mobile layout (unchanged) ── */
        <>
          {/* Greeting Section */}
          <section className="mt-2">
            <h1 className="text-2xl font-bold text-text-primary">Hello, {firstName}</h1>
            <p className="text-text-secondary text-sm mt-1">
              {loadingHomeData ? (
                <span>Loading next session...</span>
              ) : nextSession ? (
                <>
                  Next session: <span className="text-primary font-semibold">{formatNextSessionTime()}</span>
                </>
              ) : (
                <span>No upcoming sessions scheduled</span>
              )}
            </p>
          </section>

          {/* Book Sessions CTA Card */}
          <Link
            href="/schedule"
            className="block bg-primary rounded-2xl p-5 shadow-lg shadow-primary/20 transition-transform interactive-card"
          >
            <h2 className="text-white text-xl font-bold">Book Sessions</h2>
            <div className="mt-4 inline-flex items-center gap-2 bg-white text-text-primary px-4 py-2.5 rounded-full font-semibold text-sm">
              Schedule Now
              <Calendar size={18} />
            </div>
          </Link>

          {/* Messages & Payments Grid */}
          <section className={`grid gap-3 ${profile.is_trainer || profile.has_full_access ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Messages Card — only for trainers and full-access users */}
            {(profile.is_trainer || profile.has_full_access) && (
              <Link
                href="/chat"
                className="bg-bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/30 interactive-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <MessageCircle size={24} className="text-primary" />
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
                      ? `Chat with ${stats.trainerName}`
                      : 'View conversations'
                  }
                </p>
              </Link>
            )}

            {/* Payments Card */}
            <Link
              href="/payments"
              className="bg-bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/30 interactive-card"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-success/10 p-2 rounded-lg">
                  <Wallet size={24} className="text-success" />
                </div>
              </div>
              <h3 className="text-text-primary font-semibold">Payments</h3>
              <p className="text-text-secondary text-xs mt-0.5">
                Manage billing &amp; payments
              </p>
            </Link>
          </section>

          {/* Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-text-primary font-semibold">Recent Activity</h2>
              <Link href="/profile/history" className="text-primary text-sm font-medium">
                View All
              </Link>
            </div>
            {renderRecentActivityItems()}
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
                  href="/trainer/clients"
                  className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  View All
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </GlassAppLayout>
  )
}
