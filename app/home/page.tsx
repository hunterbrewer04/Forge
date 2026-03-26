'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import { useHomeData } from '@/lib/hooks/useHomeData'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { HomePageSkeleton } from '@/components/skeletons/StatsCardSkeleton'
import Image from 'next/image'
import { User, Bell, Calendar, MessageCircle, Wallet, Dumbbell, CalendarOff } from '@/components/ui/icons'
import HomeNextUpCard from './components/HomeNextUpCard'
import SessionDetailsSheet from '@/app/schedule/components/SessionDetailsSheet'
import CancelBookingModal from '@/app/schedule/components/CancelBookingModal'
import type { SessionWithDetails } from '@/modules/calendar-booking/types'
import { fetchSessionById } from '@/lib/services/sessions'
import { fetchRecentInvoices } from '@/lib/services/payments'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import { formatCurrency, centsToDollars } from '@/lib/utils/currency'

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
  const [messagingStats, setMessagingStats] = useState<Stats>({ totalConversations: 0 })
  const [loadingMessagingStats, setLoadingMessagingStats] = useState(true)

  // Fetch real home data — pass userId to avoid redundant getUser() call
  const { nextSession, recentActivity, loading: loadingHomeData, refetch: refetchHomeData } = useHomeData(profile?.id)

  // Use shared unread count hook for real-time message count
  const { unreadCount } = useUnreadCount({
    userId: profile?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.has_full_access,
  })

  // Fetch recent payments for the Payments card
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: () => fetchRecentInvoices(3),
    enabled: !!user,
  })

  // Session details popup state
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleViewDetails = useCallback(async () => {
    if (!nextSession) return
    try {
      const session = await fetchSessionById(nextSession.session_id)
      if (!session) return
      setSelectedSession(session)
    } catch (err) {
      console.error('Error fetching session details:', err)
    }
  }, [nextSession])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  // Fetch messaging-related stats (only for users with chat access)
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !profile) return
      if (!profile.is_trainer && !profile.has_full_access) {
        setLoadingMessagingStats(false)
        return
      }

      setLoadingMessagingStats(true)

      try {
        if (profile.is_trainer) {
          const res = await fetch('/api/conversations?role=trainer')
          if (res.ok) {
            const json = await res.json()
            const conversations: { id: string }[] = json.conversations || []
            setMessagingStats({
              totalConversations: conversations.length,
              clientsCount: conversations.length,
            })
          }
        } else if (profile.has_full_access) {
          const res = await fetch('/api/conversations?role=client')
          if (res.ok) {
            const json = await res.json()
            const conversation = json.conversation as {
              trainer: { full_name: string | null } | null
            } | null
            if (conversation) {
              setMessagingStats({
                totalConversations: 1,
                trainerName: conversation.trainer?.full_name || 'Coach',
              })
            }
          }
        }
      } catch (err) {
        console.error('Error fetching messaging stats:', err)
      }

      setLoadingMessagingStats(false)
    }

    fetchStats()
  }, [user, profile])

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

  // Whether the user has access to the messaging feature
  const hasMessaging = profile.is_trainer || profile.has_full_access

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
        <Image
          src="/Forge-Full-Logo.PNG"
          alt="Forge Sports Performance"
          width={120}
          height={60}
          className="h-10 w-auto object-contain"
        />

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
    <>
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
                <Image
                  src="/Forge-Full-Logo.PNG"
                  alt="Forge Sports Performance"
                  width={200}
                  height={100}
                  className="h-20 w-auto object-contain"
                />
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

          {/* Next Up Card */}
          {nextSession && !loadingHomeData && (
            <motion.div variants={fadeUpItem}>
              <HomeNextUpCard session={nextSession} onViewDetails={handleViewDetails} />
            </motion.div>
          )}

          {/* Main grid: balanced 2-column layout */}
          <motion.div variants={fadeUpItem}>
          <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="flex flex-col gap-4">
              {/* Sessions CTA */}
              <GlassCard
                variant="subtle"
                className="overflow-hidden"
                interactive
              >
                <Link
                  href={'/schedule'}
                  className="block p-6"
                  style={{
                    background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
                  }}
                >
                  <h2 className="text-white text-xl font-bold">
                    {profile.is_trainer ? 'Create Sessions' : 'Book Sessions'}
                  </h2>
                  <p className="text-white/70 text-sm mt-1">
                    {profile.is_trainer
                      ? 'View current available sessions & create new ones.'
                      : 'Browse available training slots and reserve your spot.'
                    }
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-white text-text-primary px-4 py-2.5 rounded-full font-semibold text-sm">
                    {profile.is_trainer ? 'View Sessions' : 'Schedule Now'}
                    <Calendar size={18} />
                  </div>
                </Link>
              </GlassCard>

              {/* Recent Activity */}
              <GlassCard variant="subtle" className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-text-primary font-semibold text-base">Recent Activity</h2>
                  <Link href="/profile/history" className="text-primary text-sm font-medium hover:underline">
                    View All
                  </Link>
                </div>
                {renderRecentActivityItems()}
              </GlassCard>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {/* Messages Card — only for trainers and full-access users */}
              {hasMessaging && (
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
                        : messagingStats.trainerName
                          ? `Chat with ${messagingStats.trainerName}`
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
                          {formatCurrency(centsToDollars(inv.amount_paid))}
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
              {profile.is_trainer && !loadingMessagingStats && (
                <GlassCard variant="subtle" className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm">Active Clients</p>
                      <p className="text-2xl font-bold text-text-primary">{messagingStats.clientsCount || 0}</p>
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

          {/* Next Up Card */}
          {nextSession && !loadingHomeData && (
            <HomeNextUpCard session={nextSession} onViewDetails={handleViewDetails} />
          )}

          {/* Sessions CTA Card */}
          <Link
            href={'/schedule'}
            className="block bg-primary rounded-2xl p-5 shadow-lg shadow-primary/20 transition-transform interactive-card"
          >
            <h2 className="text-white text-xl font-bold">
              {profile.is_trainer ? 'Create Sessions' : 'Book Sessions'}
            </h2>
            {profile.is_trainer && (
              <p className="text-white/70 text-sm mt-1">
                View current available sessions & create new ones.
              </p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 bg-white text-text-primary px-4 py-2.5 rounded-full font-semibold text-sm">
              {profile.is_trainer ? 'View Sessions' : 'Schedule Now'}
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
                    : messagingStats.trainerName
                      ? `Chat with ${messagingStats.trainerName}`
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
          {profile.is_trainer && !loadingMessagingStats && (
            <section className="bg-bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Active Clients</p>
                  <p className="text-2xl font-bold text-text-primary">{messagingStats.clientsCount || 0}</p>
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

      {/* Session details popup — rendered outside GlassAppLayout for proper iOS fixed positioning */}
      {selectedSession && (
        <>
          <SessionDetailsSheet
            session={selectedSession}
            isOpen={!showCancelModal}
            onClose={() => setSelectedSession(null)}
            isTrainerView={false}
            onCancelBooking={() => setShowCancelModal(true)}
          />
          {selectedSession.user_booking?.id && (
            <CancelBookingModal
              session={selectedSession}
              bookingId={selectedSession.user_booking.id}
              isOpen={showCancelModal}
              onClose={() => {
                setShowCancelModal(false)
                setSelectedSession(null)
              }}
              onCancelSuccess={() => {
                setShowCancelModal(false)
                setSelectedSession(null)
                refetchHomeData()
              }}
            />
          )}
        </>
      )}
    </>
  )
}
