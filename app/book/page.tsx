'use client'

import { useState, useEffect, useCallback } from 'react'
import CalendarStrip from '@/app/schedule/components/CalendarStrip'
import SessionFilters from '@/app/schedule/components/SessionFilters'
import SessionCard from '@/app/schedule/components/SessionCard'
import GuestBookingForm from './components/GuestBookingForm'
import BookingConfirmation from './components/BookingConfirmation'
import type { SessionWithDetails, SessionType } from '@/lib/types/sessions'

function getTodayISO(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

interface GuestBookingResult {
  bookingId: string
  session: SessionWithDetails
  guestEmail: string
  guestName: string
}

export default function BookPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayISO())
  const [activeFilter, setActiveFilter] = useState('all')
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [datesWithSessions, setDatesWithSessions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [bookingResult, setBookingResult] = useState<GuestBookingResult | null>(null)

  // Fetch session types once on mount
  useEffect(() => {
    fetch('/api/v1/session-types')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSessionTypes(data.sessionTypes)
      })
      .catch(console.error)
  }, [])

  // Prefetch next 60 days to build datesWithSessions for calendar dots
  useEffect(() => {
    const from = getTodayISO()
    const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    fetch(`/api/v1/sessions?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const dates = new Set<string>(
            (data.sessions as SessionWithDetails[]).map((s) => s.starts_at.split('T')[0])
          )
          setDatesWithSessions(dates)
        }
      })
      .catch(console.error)
  }, [])

  // Fetch sessions for selected date + filter
  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ date: selectedDate })
      if (activeFilter !== 'all') params.set('type', activeFilter)
      const res = await fetch(`/api/v1/sessions?${params}`)
      const data = await res.json()
      if (data.success) {
        setSessions(data.sessions)
      } else {
        setError('Failed to load sessions.')
      }
    } catch {
      setError('Failed to load sessions.')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, activeFilter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filters = [
    { key: 'all', label: 'All' },
    ...sessionTypes.map((t) => ({ key: t.slug, label: t.name })),
  ]

  // Confirmation view replaces the session list
  if (bookingResult) {
    return (
      <BookingConfirmation
        session={bookingResult.session}
        guestEmail={bookingResult.guestEmail}
        guestName={bookingResult.guestName}
        onBookAnother={() => {
          setBookingResult(null)
          setSelectedSession(null)
          setShowForm(false)
        }}
      />
    )
  }

  return (
    <div className="pb-8">
      <div className="p-4">
        <CalendarStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          datesWithSessions={datesWithSessions}
          bookedDates={new Set()}
        />
      </div>

      <div className="px-4 pb-2">
        <SessionFilters
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      <div className="px-4 space-y-3 pt-1">
        {loading && (
          <div className="flex justify-center py-12">
            <div
              className="w-6 h-6 border-2 border-stone-300 border-t-transparent rounded-full animate-spin"
              style={{ borderTopColor: 'var(--facility-primary)' }}
            />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-sm mb-3">{error}</p>
            <button
              onClick={fetchSessions}
              className="text-sm font-medium"
              style={{ color: 'var(--facility-primary)' }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-sm">No sessions available for this date.</p>
          </div>
        )}

        {!loading &&
          !error &&
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              publicMode={true}
              onBook={() => {
                setSelectedSession(session)
                setShowForm(true)
              }}
              onCancel={() => {}}
              onTap={() => {
                setSelectedSession(session)
                setShowForm(true)
              }}
            />
          ))}
      </div>

      {/* Guest Booking Form Modal */}
      {showForm && selectedSession && (
        <GuestBookingForm
          session={selectedSession}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setSelectedSession(null)
          }}
          onSuccess={(bookingId, guestEmail, guestName) => {
            setShowForm(false)
            setBookingResult({
              bookingId,
              session: selectedSession,
              guestEmail,
              guestName,
            })
          }}
        />
      )}
    </div>
  )
}
