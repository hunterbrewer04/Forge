'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { Calendar, Clock, MapPin, User, Loader2 } from '@/components/ui/icons'
import BookingModal from '../components/BookingModal'
import CancelBookingModal from '../components/CancelBookingModal'
import type { SessionWithDetails } from '@/lib/types/sessions'

export default function SessionDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch session details
  useEffect(() => {
    if (!user || !sessionId) return

    const fetchSession = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/sessions/${sessionId}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Session not found')
          }
          throw new Error('Failed to load session')
        }

        const data = await response.json()
        setSession(data.session)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session')
        console.error('Failed to fetch session:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [user, sessionId])

  // Handle booking success
  const handleBookingSuccess = async () => {
    // Refetch session to update booking status
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
      }
    } catch (err) {
      console.error('Failed to refresh session:', err)
    }
  }

  // Handle cancel success
  const handleCancelSuccess = async () => {
    // Refetch session to update booking status
    try {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data.session)
      }
    } catch (err) {
      console.error('Failed to refresh session:', err)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Calculate capacity percentage for color
  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <Loader2 size={48} className="text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark px-4">
        <p className="text-red-400 text-center mb-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isBooked = !!session.user_booking
  const isFull = session.availability.is_full
  const canBook = !isBooked && !isFull
  const capacityPercentage = (session.availability.booked_count / session.availability.capacity) * 100

  return (
    <MobileLayout showBack={true} title="Session Details" showBottomNav={false}>
      <div className="space-y-6 pb-32">
        {/* Session Type Badge */}
        {session.session_type && (
          <div>
            <span
              className="inline-block px-3 py-1.5 text-sm font-bold rounded-full"
              style={{
                backgroundColor: `${session.session_type.color}20`,
                color: session.session_type.color,
              }}
            >
              {session.session_type.name}
            </span>
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-3">{session.title}</h1>
          {session.description && (
            <p className="text-gray-400 text-base leading-relaxed">{session.description}</p>
          )}
        </div>

        {/* Date & Time */}
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Calendar size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
              <p className="text-white font-medium">{formatDate(session.starts_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Clock size={24} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time</p>
              <p className="text-white font-medium">
                {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-dark rounded-full border border-gray-700">
          <Clock size={18} className="text-primary" />
          <span className="text-white font-medium">{session.duration_minutes} minutes</span>
        </div>

        {/* Trainer Card */}
        {session.trainer && (
          <div className="bg-surface-dark rounded-lg p-4 border border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Trainer</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                {session.trainer.avatar_url ? (
                  <img
                    src={session.trainer.avatar_url}
                    alt={session.trainer.full_name || 'Trainer'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-white font-bold text-lg">
                  {session.trainer.full_name || 'Trainer'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        {session.location && (
          <div className="bg-surface-dark rounded-lg p-4 border border-gray-800">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
                <p className="text-white font-medium">{session.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* Capacity */}
        <div className="bg-surface-dark rounded-lg p-4 border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Capacity</p>
            <p className="text-white font-bold">
              {session.availability.booked_count} of {session.availability.capacity} spots filled
            </p>
          </div>
          {/* Capacity Bar */}
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getCapacityColor(capacityPercentage)}`}
              style={{ width: `${capacityPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {session.availability.spots_left === 0 ? (
              <span className="text-red-400 font-medium">Session is full</span>
            ) : session.availability.spots_left === 1 ? (
              <span className="text-yellow-400 font-medium">Only 1 spot left!</span>
            ) : (
              <span className="text-green-400 font-medium">
                {session.availability.spots_left} spots available
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-6 pb-safe-bottom">
        <div className="max-w-md lg:max-w-2xl xl:max-w-4xl mx-auto px-4 sm:px-6">
          {isBooked ? (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full py-4 bg-red-500/10 border-2 border-red-500 text-red-400 font-bold rounded-lg hover:bg-red-500/20 transition-all text-lg"
            >
              Cancel Booking
            </button>
          ) : isFull ? (
            <button
              disabled
              className="w-full py-4 bg-gray-800 text-gray-500 font-bold rounded-lg cursor-not-allowed text-lg"
            >
              Session Full
            </button>
          ) : (
            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-lg"
            >
              Book Session
            </button>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {session && (
        <>
          <BookingModal
            session={session}
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            onBookingSuccess={handleBookingSuccess}
          />

          {session.user_booking && (
            <CancelBookingModal
              session={session}
              bookingId={session.user_booking.id}
              isOpen={showCancelModal}
              onClose={() => setShowCancelModal(false)}
              onCancelSuccess={handleCancelSuccess}
            />
          )}
        </>
      )}
    </MobileLayout>
  )
}
