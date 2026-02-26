'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion } from 'framer-motion'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { ArrowLeft, CalendarOff, Plus } from '@/components/ui/icons'
import { useScheduleData } from '@/lib/hooks/useScheduleData'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import CalendarStrip from './components/CalendarStrip'
import SessionCard from './components/SessionCard'

const BookingModal = dynamic(() => import('./components/BookingModal'), { ssr: false })
const CancelBookingModal = dynamic(() => import('./components/CancelBookingModal'), { ssr: false })
const SessionDetailsSheet = dynamic(() => import('./components/SessionDetailsSheet'), { ssr: false })
import type { SessionWithDetails } from '@/lib/types/sessions'

export default function SchedulePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  // Booking modal state
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showDetailsSheet, setShowDetailsSheet] = useState(false)

  // Data hook
  const {
    sessions,
    loading,
    error,
    fetchSessions,
    datesWithSessions,
  } = useScheduleData({ userId: user?.id })

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

  // Get sessions for selected date
  const selectedDateSessions = useMemo(() => {
    return sessions
      .filter((s) => s.starts_at.startsWith(selectedDate))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [sessions, selectedDate])

  // Handlers
  const handleBookSession = useCallback((session: SessionWithDetails) => {
    setSelectedSession(session)
    setShowBookingModal(true)
  }, [])

  const handleCancelBooking = useCallback((session: SessionWithDetails) => {
    setSelectedSession(session)
    setShowCancelModal(true)
  }, [])

  const handleViewDetails = useCallback((session: SessionWithDetails) => {
    setSelectedSession(session)
    setShowDetailsSheet(true)
  }, [])

  const handleTapSession = useCallback((session: SessionWithDetails) => {
    if (profile?.is_trainer) {
      // Trainers always open details
      handleViewDetails(session)
    } else if (session.user_booking) {
      // Client with booking opens details
      handleViewDetails(session)
    } else {
      // Client without booking opens booking modal
      handleBookSession(session)
    }
  }, [handleViewDetails, handleBookSession, profile?.is_trainer])

  const handleBookingSuccess = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCancelSuccess = useCallback(() => {
    fetchSessions()
  }, [fetchSessions])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/member/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <div className="text-text-secondary text-sm">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Get selected date label
  const selectedDateObj = new Date(selectedDate + 'T12:00:00')
  const selectedDateLabel = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  // Custom header for schedule page
  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-semibold text-text-primary">
          {profile?.is_trainer ? 'Sessions' : 'Book a Session'}
        </h1>

        <div className="size-10" /> {/* Spacer for centering */}
      </div>
    </header>
  )

  return (
    <>
      <GlassAppLayout customHeader={customHeader} desktopTitle={profile?.is_trainer ? 'Sessions' : 'Book a Session'}>
        {/* Calendar */}
        <GlassCard variant="subtle" className="p-4 lg:p-3">
          <CalendarStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            datesWithSessions={datesWithSessions}
            bookedDates={bookedDates}
          />
        </GlassCard>

        {/* Trainer: Create Session Link */}
        {profile?.is_trainer && (
          <Link
            href="/schedule/new"
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl font-semibold text-sm hover:bg-primary/20 transition-all interactive-card"
          >
            <Plus size={20} />
            Create New Session
          </Link>
        )}

        {/* Selected Date Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary font-semibold">{selectedDateLabel}</h2>
          {selectedDateSessions.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              {selectedDateSessions.length} Available
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="text-text-secondary text-sm">Loading sessions...</div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12 bg-bg-card rounded-xl border border-error/20 p-6">
            <p className="text-error mb-4 text-center">{error}</p>
            <button
              onClick={() => fetchSessions()}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Sessions List */}
        {!loading && !error && (
          <div className="flex-1 flex flex-col">
            {selectedDateSessions.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-2 gap-3">
                {selectedDateSessions.map((session) => (
                  <motion.div key={session.id} variants={fadeUpItem}>
                    <GlassCard
                      variant="subtle"
                      interactive
                      className="overflow-hidden"
                    >
                      <SessionCard
                        session={session}
                        userId={user?.id}
                        isTrainer={profile?.is_trainer}
                        onBook={() => handleBookSession(session)}
                        onCancel={() => handleCancelBooking(session)}
                        onTap={() => handleTapSession(session)}
                        onDetails={() => handleViewDetails(session)}
                      />
                    </GlassCard>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-bg-secondary p-4 rounded-full mb-4">
                  <CalendarOff size={32} className="text-text-muted" />
                </div>
                <h3 className="text-text-primary font-semibold mb-1">No sessions available</h3>
                <p className="text-text-secondary text-sm">
                  There are no sessions scheduled for this date.
                </p>
              </div>
            )}
          </div>
        )}
      </GlassAppLayout>

      {/* Modals -- outside layout to avoid iOS fixed-positioning issues */}
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

      {selectedSession && (
        <SessionDetailsSheet
          session={selectedSession}
          isOpen={showDetailsSheet}
          onClose={() => {
            setShowDetailsSheet(false)
            setSelectedSession(null)
          }}
          isTrainerView={!!profile?.is_trainer}
          onBookSession={() => {
            setShowDetailsSheet(false)
            setShowBookingModal(true)
          }}
          onCancelBooking={() => {
            setShowDetailsSheet(false)
            setShowCancelModal(true)
          }}
        />
      )}
    </>
  )
}
