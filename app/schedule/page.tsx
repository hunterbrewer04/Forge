'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { Bell, User, ChevronLeft, ChevronRight, Clock, Zap, Lock, Plus, Check, RefreshCw } from '@/components/ui/icons'
import BookingModal from './components/BookingModal'
import CancelBookingModal from './components/CancelBookingModal'
import type { SessionWithDetails, SessionType } from '@/lib/types/sessions'

type TabType = 'upcoming' | 'history'

// Generate dates for the calendar strip
function generateDates(baseDate: Date): { day: string; date: number; fullDate: Date; isoDate: string }[] {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate)
    date.setDate(baseDate.getDate() + i)
    dates.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date,
      isoDate: date.toISOString().split('T')[0],
    })
  }
  return dates
}

export default function SchedulePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Booking modal state
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Ref for aborting in-flight requests on navigation/unmount
  const abortControllerRef = useRef<AbortController | null>(null)

  // Generate calendar dates starting from today
  const baseDate = useMemo(() => new Date(), [])
  const calendarDates = useMemo(() => generateDates(baseDate), [baseDate])
  const currentMonth = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedDate = calendarDates[selectedDateIndex]?.isoDate

  // Fetch session types on mount
  useEffect(() => {
    async function fetchSessionTypes() {
      try {
        const response = await fetch('/api/sessions?status=scheduled&limit=1')
        if (response.ok) {
          // We'll extract types from sessions or fetch separately
        }
      } catch (err) {
        console.error('Failed to fetch session types:', err)
      }
    }
    fetchSessionTypes()
  }, [])

  // Fetch sessions for selected date
  const fetchSessions = useCallback(async (isRefresh = false) => {
    if (!selectedDate) return

    // Abort any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/sessions?date=${selectedDate}&status=scheduled`, { signal })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()

      // Check if request was aborted before updating state
      if (signal.aborted) return

      setSessions(data.sessions || [])

      // Extract unique session types from sessions
      const types = new Map<string, SessionType>()
      data.sessions?.forEach((session: SessionWithDetails) => {
        if (session.session_type) {
          types.set(session.session_type.id, session.session_type)
        }
      })
      setSessionTypes(Array.from(types.values()))
    } catch (err) {
      // Ignore abort errors - they're expected on navigation/unmount
      if (err instanceof Error && err.name === 'AbortError') return

      setError(err instanceof Error ? err.message : 'Failed to load sessions')
      console.error('Failed to fetch sessions:', err)
    } finally {
      // Only update loading states if not aborted
      if (!signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [selectedDate])

  // Fetch sessions when date changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchSessions()
    }

    // Cleanup: abort any in-flight requests on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [user, selectedDate, fetchSessions])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchSessions(true)
    }, 30000)

    return () => {
      clearInterval(interval)
      // Also abort any in-flight refresh request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [user, fetchSessions])

  // Filter sessions by type
  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return sessions
    return sessions.filter((s) => s.session_type?.slug === activeFilter)
  }, [sessions, activeFilter])

  // Get user's next booked session
  const nextBookedSession = useMemo(() => {
    const booked = sessions.find((s) => s.user_booking)
    if (booked) {
      return {
        name: booked.title,
        time: new Date(booked.starts_at).toLocaleString('en-US', {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        coach: booked.trainer?.full_name || 'Trainer',
        session: booked,
      }
    }
    return null
  }, [sessions])

  // Build filter options from session types
  const filters = useMemo(() => {
    const baseFilters = [{ key: 'all', label: 'All Sessions' }]
    const typeFilters = sessionTypes.map((t) => ({
      key: t.slug,
      label: t.name,
    }))
    return [...baseFilters, ...typeFilters]
  }, [sessionTypes])

  // Handle booking
  const handleBookSession = (session: SessionWithDetails) => {
    setSelectedSession(session)
    setShowBookingModal(true)
  }

  // Handle cancel booking
  const handleCancelBooking = (session: SessionWithDetails) => {
    setSelectedSession(session)
    setShowCancelModal(true)
  }

  // Handle booking success
  const handleBookingSuccess = () => {
    fetchSessions(true)
  }

  // Handle cancel success
  const handleCancelSuccess = () => {
    fetchSessions(true)
  }

  // Handle manual refresh
  const handleRefresh = () => {
    fetchSessions(true)
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-stone-400">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Custom TopBar content for schedule page
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
      <button className="relative p-2 text-gray-300 hover:text-primary transition-colors">
        <Bell size={24} strokeWidth={2} />
        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
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
      topBarLeftContent={
        <h2 className="text-xl font-bold uppercase tracking-wide text-white">Session Booking</h2>
      }
      topBarRightContent={topBarRightContent}
    >
      {/* Navigation Tabs */}
      <div className="flex gap-6 text-sm font-semibold uppercase tracking-wider -mt-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* Next Up Card - Only show if user has a booking */}
      {nextBookedSession && (
        <div className="bg-surface-dark rounded-lg p-4 shadow-md border-l-4 border-primary flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-primary uppercase mb-1">Next Up</p>
            <h3 className="text-lg font-bold leading-tight text-white">{nextBookedSession.name}</h3>
            <p className="text-sm text-gray-400 mt-1">
              {nextBookedSession.time} &bull; {nextBookedSession.coach}
            </p>
          </div>
          <button
            onClick={() => handleCancelBooking(nextBookedSession.session)}
            className="bg-[#3a2e27] text-xs font-bold px-3 py-2 rounded uppercase tracking-wide hover:bg-[#4a3b32] transition-colors text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Calendar Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">{currentMonth}</h3>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <button className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x -mx-4 px-4">
          {calendarDates.map((dateItem, index) => (
            <button
              key={index}
              onClick={() => setSelectedDateIndex(index)}
              className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-14 h-20 rounded-lg transition-all ${
                selectedDateIndex === index
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                  : 'bg-surface-dark border border-gray-700 text-gray-400 hover:border-primary/50'
              }`}
            >
              <span className={`text-xs font-medium ${selectedDateIndex === index ? 'opacity-80' : ''}`}>
                {dateItem.day}
              </span>
              <span className={`text-xl font-bold ${selectedDateIndex !== index ? 'text-white' : ''}`}>
                {dateItem.date}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Type Filters */}
      <div className="overflow-x-auto no-scrollbar flex gap-3 -mx-4 px-4">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter.key
                ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                : 'bg-surface-dark border border-gray-700 text-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Loading sessions...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-400 mb-2">No sessions available</p>
          <p className="text-gray-500 text-sm">
            Try selecting a different date or filter
          </p>
        </div>
      )}

      {/* Session List */}
      {!loading && !error && filteredSessions.length > 0 && (
        <div className="space-y-4 pb-6">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onBook={() => handleBookSession(session)}
              onCancel={() => handleCancelBooking(session)}
            />
          ))}
        </div>
      )}

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

interface SessionCardProps {
  session: SessionWithDetails
  onBook: () => void
  onCancel: () => void
}

function SessionCard({ session, onBook, onCancel }: SessionCardProps) {
  const startTime = new Date(session.starts_at)
  const time = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
  const period = startTime.getHours() < 12 ? 'AM' : 'PM'

  const isBooked = !!session.user_booking
  const isFull = session.availability.is_full
  const spotsLeft = session.availability.spots_left

  // Premium session style
  if (session.is_premium) {
    return (
      <div className="group relative bg-gradient-to-r from-surface-dark to-[#3a3a1a] rounded-xl p-4 shadow-sm border border-gold/30 hover:border-gold transition-all">
        <div className="absolute top-0 right-0 bg-gold text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
          Premium
        </div>
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
            <span className="text-lg font-bold text-gold">{time}</span>
            <span className="text-xs text-gray-400 uppercase font-bold">{period}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-gold transition-colors">
              {session.title}
            </h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                <Clock size={14} strokeWidth={2} className="mr-1" />
                {session.duration_minutes} min
              </span>
              {isBooked ? (
                <span className="text-xs font-medium text-green-500 uppercase">Booked</span>
              ) : spotsLeft !== null && (
                <span className="text-xs font-medium text-gold">
                  {spotsLeft === 1 ? 'Only 1 slot' : `${spotsLeft} spots left`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
                <User size={14} strokeWidth={2} className="text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-300">
                {session.trainer?.full_name || 'Trainer'}
              </span>
            </div>
          </div>
          {isBooked ? (
            <button
              onClick={onCancel}
              className="self-center bg-green-500/20 border border-green-500 text-green-500 font-bold p-2 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
            >
              <Check size={24} strokeWidth={2} />
            </button>
          ) : (
            <button
              onClick={onBook}
              className="self-center bg-gold text-black font-bold p-2 rounded-lg hover:bg-yellow-400 transition-colors shadow-lg shadow-gold/20"
            >
              <Zap size={24} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Full session style (not booked by user)
  if (isFull && !isBooked) {
    return (
      <div className="group relative bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-800 opacity-70">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
            <span className="text-lg font-bold text-gray-500">{time}</span>
            <span className="text-xs text-gray-600 uppercase font-bold">{period}</span>
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-gray-400 leading-tight mb-1">{session.title}</h4>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center text-xs font-medium text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                <Clock size={14} strokeWidth={2} className="mr-1" />
                {session.duration_minutes} min
              </span>
              <span className="text-xs font-medium text-red-500 uppercase">Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden grayscale opacity-50 flex items-center justify-center">
                <User size={14} strokeWidth={2} className="text-gray-400" />
              </div>
              <span className="text-sm font-medium text-gray-500">
                {session.trainer?.full_name || 'Trainer'}
              </span>
            </div>
          </div>
          <button className="self-center bg-transparent border border-gray-700 text-gray-600 font-bold p-2 rounded-lg cursor-not-allowed">
            <Lock size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    )
  }

  // Regular session style (booked or available)
  return (
    <div className="group relative bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-800 hover:border-primary/50 transition-all">
      {isBooked && (
        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
          Booked
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
          <span className={`text-lg font-bold ${isBooked ? 'text-green-500' : 'text-white'}`}>
            {time}
          </span>
          <span className="text-xs text-gray-400 uppercase font-bold">{period}</span>
        </div>
        <div className="flex-1">
          <h4 className={`text-lg font-bold leading-tight mb-1 transition-colors ${
            isBooked ? 'text-green-500' : 'text-white group-hover:text-primary'
          }`}>
            {session.title}
          </h4>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
              <Clock size={14} strokeWidth={2} className="mr-1" />
              {session.duration_minutes} min
            </span>
            {isBooked ? (
              <span className="text-xs font-medium text-green-500">Your spot reserved</span>
            ) : spotsLeft !== null && (
              <span className="text-xs font-medium text-primary">{spotsLeft} spots left</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
              <User size={14} strokeWidth={2} className="text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-300">
              {session.trainer?.full_name || 'Trainer'}
            </span>
          </div>
        </div>
        {isBooked ? (
          <button
            onClick={onCancel}
            className="self-center bg-green-500/20 border border-green-500 text-green-500 font-bold p-2 rounded-lg hover:bg-green-500 hover:text-white transition-colors"
          >
            <Check size={24} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={onBook}
            className="self-center bg-white text-black font-bold p-2 rounded-lg hover:bg-primary hover:text-white transition-colors shadow-lg"
          >
            <Plus size={24} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}
