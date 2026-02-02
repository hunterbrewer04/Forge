'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import MobileLayout from '@/components/layout/MobileLayout'
import { User, Plus, RefreshCw } from '@/components/ui/icons'
import { useScheduleData } from '@/lib/hooks/useScheduleData'
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh'
import { hapticLight } from '@/lib/utils/haptics'
import CalendarStrip from './components/CalendarStrip'
import SessionCard from './components/SessionCard'
import NextUpCard from './components/NextUpCard'
import SessionFilters from './components/SessionFilters'
import EmptyState from './components/EmptyState'
import BookingModal from './components/BookingModal'
import CancelBookingModal from './components/CancelBookingModal'
import type { SessionWithDetails } from '@/lib/types/sessions'

type TabType = 'upcoming' | 'history'

export default function SchedulePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  // Booking modal state
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Data hook
  const {
    sessions,
    loading,
    error,
    refreshing,
    fetchSessions,
    datesWithSessions,
    filters,
  } = useScheduleData({ userId: user?.id })

  // Pull-to-refresh
  const {
    pullDistance,
    isRefreshing: ptrRefreshing,
    handlers: ptrHandlers,
    containerRef,
  } = usePullToRefresh({
    onRefresh: async () => {
      await fetchSessions()
    },
  })

  // Filter sessions by type
  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return sessions
    return sessions.filter((s) => s.session_type?.slug === activeFilter)
  }, [sessions, activeFilter])

  // Compute booked dates for calendar
  const bookedDates = useMemo(() => {
    const dates = new Set<string>()
    sessions.forEach((s) => {
      if (s.user_booking) {
        dates.add(s.starts_at.split('T')[0])
      }
    })
    return dates
  }, [sessions])

  // Filter sessions based on active tab
  const tabFilteredSessions = useMemo(() => {
    const now = new Date().toISOString()
    if (activeTab === 'history') {
      return filteredSessions
        .filter((s) => s.starts_at < now)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    }
    return filteredSessions.filter((s) => s.starts_at >= now)
  }, [filteredSessions, activeTab])

  // Get sessions for selected date in calendar strip
  const selectedDateSessions = useMemo(() => {
    if (activeTab === 'history') return []
    return tabFilteredSessions.filter((s) => s.starts_at.startsWith(selectedDate))
  }, [tabFilteredSessions, selectedDate, activeTab])

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { [dateKey: string]: { label: string; sessions: SessionWithDetails[] } } = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    tabFilteredSessions.forEach((session) => {
      const sessionDate = new Date(session.starts_at)
      sessionDate.setHours(0, 0, 0, 0)
      const dateKey = session.starts_at.split('T')[0]

      if (!groups[dateKey]) {
        let label: string
        if (sessionDate.getTime() === today.getTime()) {
          label = 'Today'
        } else if (sessionDate.getTime() === tomorrow.getTime()) {
          label = 'Tomorrow'
        } else {
          label = sessionDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })
        }
        groups[dateKey] = { label, sessions: [] }
      }
      groups[dateKey].sessions.push(session)
    })

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, group]) => ({ dateKey, ...group }))
  }, [tabFilteredSessions])

  // Get user's next booked session
  const nextBookedSession = useMemo(() => {
    const now = new Date().toISOString()
    return sessions.find((s) => s.user_booking && s.starts_at >= now) || null
  }, [sessions])

  // Handlers
  const handleBookSession = useCallback((session: SessionWithDetails) => {
    hapticLight()
    setSelectedSession(session)
    setShowBookingModal(true)
  }, [])

  const handleCancelBooking = useCallback((session: SessionWithDetails) => {
    hapticLight()
    setSelectedSession(session)
    setShowCancelModal(true)
  }, [])

  const handleTapSession = useCallback((session: SessionWithDetails) => {
    router.push(`/schedule/${session.id}`)
  }, [router])

  const handleBookingSuccess = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCancelSuccess = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRefresh = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="text-stone-400 text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Get selected date label for empty state
  const selectedDateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  // Active filter label for empty state
  const activeFilterLabel = filters.find((f) => f.key === activeFilter)?.label || ''

  // TopBar right content
  const topBarRightContent = (
    <div className="flex gap-2 items-center">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`relative p-2 text-gray-300 hover:text-primary transition-colors ${
          refreshing ? 'animate-spin' : ''
        }`}
      >
        <RefreshCw size={20} strokeWidth={2} />
      </button>
      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 flex items-center justify-center">
        <User size={16} strokeWidth={2} className="text-gray-400" />
      </div>
    </div>
  )

  return (
    <MobileLayout
      showBottomNav={true}
      showNotifications={false}
      title="Schedule"
      topBarRightContent={topBarRightContent}
    >
      {/* Pull-to-Refresh Indicator */}
      {(pullDistance > 0 || ptrRefreshing) && (
        <div
          className="flex justify-center -mt-4 mb-2 overflow-hidden"
          style={{ height: pullDistance > 0 ? pullDistance : 40 }}
        >
          <div
            className={`w-8 h-8 border-2 border-primary/50 border-t-primary rounded-full ${
              ptrRefreshing ? 'ptr-spinner' : ''
            }`}
            style={{
              transform: `scale(${Math.min(pullDistance / 80, 1)})`,
              opacity: Math.min(pullDistance / 40, 1),
            }}
          />
        </div>
      )}

      {/* Content with pull-to-refresh handlers */}
      <div
        ref={containerRef}
        onTouchStart={ptrHandlers.onTouchStart as unknown as React.TouchEventHandler}
        onTouchMove={ptrHandlers.onTouchMove as unknown as React.TouchEventHandler}
        onTouchEnd={ptrHandlers.onTouchEnd}
        className="flex flex-col gap-6"
      >
        {/* Navigation Tabs */}
        <div className="flex gap-6 text-sm font-semibold uppercase tracking-wider -mt-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 border-b-[3px] transition-colors active:scale-95 ${
              activeTab === 'upcoming'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-[3px] transition-colors active:scale-95 ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        {/* Create Session - Trainer Only */}
        {profile?.is_trainer && (
          <Link
            href="/schedule/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl font-semibold text-sm hover:bg-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus size={18} strokeWidth={2.5} />
            New Session
          </Link>
        )}

        {/* Next Up Card */}
        {nextBookedSession && activeTab === 'upcoming' && (
          <NextUpCard
            session={nextBookedSession}
            onCancel={() => handleCancelBooking(nextBookedSession)}
            onViewDetails={() => handleTapSession(nextBookedSession)}
          />
        )}

        {/* Calendar Strip - Upcoming tab only */}
        {activeTab === 'upcoming' && (
          <CalendarStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            datesWithSessions={datesWithSessions}
            bookedDates={bookedDates}
          />
        )}

        {/* Session Type Filters */}
        <SessionFilters
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-stone-400 text-sm">Loading sessions...</div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 bg-[#232323] rounded-2xl border border-red-500/20 p-6">
            <p className="text-red-400 mb-4 text-center">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty States */}
        {!loading && !error && (
          <>
            {/* No sessions at all */}
            {filteredSessions.length === 0 && activeTab === 'upcoming' && (
              activeFilter !== 'all' ? (
                <EmptyState variant="filter-empty" filterLabel={activeFilterLabel} />
              ) : (
                <EmptyState variant="no-sessions" />
              )
            )}

            {/* History empty */}
            {activeTab === 'history' && tabFilteredSessions.length === 0 && (
              <EmptyState variant="history-empty" />
            )}

            {/* Selected Date Sessions */}
            {activeTab === 'upcoming' && filteredSessions.length > 0 && (
              <>
                {selectedDateSessions.length > 0 ? (
                  <div className="space-y-4 pb-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      {selectedDateLabel}
                    </h3>
                    <div className="space-y-3">
                      {selectedDateSessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onBook={() => handleBookSession(session)}
                          onCancel={() => handleCancelBooking(session)}
                          onTap={() => handleTapSession(session)}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState variant="no-sessions-date" dateLabel={selectedDateLabel} />
                )}
              </>
            )}

            {/* All Upcoming / History Sessions */}
            {tabFilteredSessions.length > 0 && (
              <div className="space-y-4 pb-6">
                <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                  {activeTab === 'history' ? 'Past Sessions' : 'All Upcoming'}
                </h3>
                {groupedSessions.map((group) => (
                  <div key={group.dateKey}>
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
                      {group.label}
                    </h3>
                    <div className="space-y-3">
                      {group.sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onBook={() => handleBookSession(session)}
                          onCancel={() => handleCancelBooking(session)}
                          onTap={() => handleTapSession(session)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Modal */}
      {selectedSession && (
        <BookingModal
          session={selectedSession}
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false)
            setSelectedSession(null)
          }}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Cancel Booking Modal */}
      {selectedSession?.user_booking && (
        <CancelBookingModal
          session={selectedSession}
          bookingId={selectedSession.user_booking.id}
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false)
            setSelectedSession(null)
          }}
          onCancelSuccess={handleCancelSuccess}
        />
      )}

    </MobileLayout>
  )
}
