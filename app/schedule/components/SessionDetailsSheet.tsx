'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Clock, MapPin, User, Calendar, Users } from '@/components/ui/icons'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import type { SessionWithDetails } from '@/lib/types/sessions'
import Image from 'next/image'

interface SessionDetailsSheetProps {
  session: SessionWithDetails
  isOpen: boolean
  onClose: () => void
  isTrainerView: boolean
  onBookSession?: () => void
  onCancelBooking?: () => void
}

interface BookingWithClient {
  id: string
  client: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function SessionDetailsSheet({
  session,
  isOpen,
  onClose,
  isTrainerView,
  onBookSession,
  onCancelBooking,
}: SessionDetailsSheetProps) {
  const [translateY, setTranslateY] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [bookings, setBookings] = useState<BookingWithClient[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  const mountedRef = useRef(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch bookings for trainer view
  useEffect(() => {
    if (isOpen && isTrainerView && session?.id) {
      const fetchBookings = async () => {
        setLoadingBookings(true)
        try {
          const response = await fetch(`/api/sessions/${session.id}/bookings`)
          if (response.ok) {
            const data = await response.json()
            if (mountedRef.current) {
              setBookings(data.bookings || [])
            }
          }
        } catch (error) {
          console.error('Failed to fetch bookings:', error)
        } finally {
          if (mountedRef.current) {
            setLoadingBookings(false)
          }
        }
      }
      fetchBookings()
    }
  }, [isOpen, isTrainerView, session?.id])

  if (!isOpen) return null

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleClose = () => {
    onClose()
    setTranslateY(0)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const delta = currentY - touchStartY
    if (delta > 0 && (!scrollRef.current || scrollRef.current.scrollTop === 0)) {
      setTranslateY(delta)
    }
  }

  const handleTouchEnd = () => {
    if (translateY > 100) {
      handleClose()
    } else {
      setTranslateY(0)
    }
  }

  const isBooked = !!session.user_booking
  const isFull = session.availability.is_full && !session.user_booking

  return (
    <div className={`fixed inset-0 z-[70] flex justify-center ${isDesktop ? 'items-center p-4' : 'items-end'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet Content */}
      <div
        className={`relative w-full max-h-[85dvh] flex flex-col ${
          isDesktop
            ? 'max-w-xl glass rounded-2xl animate-scale-up'
            : 'max-w-md bg-surface-dark rounded-t-2xl animate-slide-up safe-area-bottom'
        }`}
        style={!isDesktop ? {
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s ease-out' : 'none'
        } : undefined}
        {...(!isDesktop ? {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
        } : {})}
      >
        {/* Session Type Color Header Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: session.session_type?.color || '#ff6714' }}
        />

        {/* Header: Drag Handle */}
        {!isDesktop && (
          <div className="px-6 pt-2 shrink-0">
            <div className="flex justify-center pb-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Scrollable Body */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto px-6 min-h-0 ${isDesktop ? 'pt-6' : ''}`}>
          {/* Session Info */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">
              {session.title}
            </h2>

            {session.session_type && (
              <span
                className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-4"
                style={{
                  backgroundColor: `${session.session_type.color}20`,
                  color: session.session_type.color,
                }}
              >
                {session.session_type.name}
              </span>
            )}

            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-primary" />
                <span>{formatDate(session.starts_at)}</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock size={18} className="text-primary" />
                <span>
                  {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                  <span className="text-gray-500 ml-2">
                    ({session.duration_minutes} min)
                  </span>
                </span>
              </div>

              {session.location && (
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-primary" />
                  <span>{session.location}</span>
                </div>
              )}

              {session.trainer && (
                <div className="flex items-center gap-3">
                  <User size={18} className="text-primary" />
                  <span>{session.trainer.full_name || 'Trainer'}</span>
                </div>
              )}
            </div>

            {session.description && (
              <p className="mt-4 text-sm text-gray-400">{session.description}</p>
            )}
          </div>

          {/* Availability */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-400">Availability</span>
              <span
                className={`font-bold ${
                  session.availability.spots_left <= 2
                    ? 'text-yellow-500'
                    : 'text-green-500'
                }`}
              >
                {session.availability.spots_left} of{' '}
                {session.availability.capacity} {session.availability.spots_left === 1 ? 'spot' : 'spots'} left
              </span>
            </div>

            {/* Capacity Visual */}
            {session.availability.capacity <= 10 ? (
              <div className="flex gap-1.5 justify-center">
                {Array.from({ length: session.availability.capacity }).map((_, i) => {
                  const bookedCount = session.availability.capacity - session.availability.spots_left
                  const isFilled = i < bookedCount
                  return (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        isFilled ? 'bg-primary' : 'bg-gray-700'
                      }`}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((session.availability.capacity - session.availability.spots_left) /
                        session.availability.capacity) *
                      100
                    }%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Trainer View: Booked Members */}
          {isTrainerView && (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-primary" />
                <span className="text-white font-semibold">Booked Members</span>
                {!loadingBookings && (
                  <span className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    {bookings.length}
                  </span>
                )}
              </div>

              {loadingBookings ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="flex items-center gap-3 py-2">
                      {booking.client.avatar_url ? (
                        <Image
                          src={booking.client.avatar_url}
                          alt={booking.client.full_name || 'Member'}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User size={16} className="text-gray-400" />
                        </div>
                      )}
                      <span className="text-gray-300">
                        {booking.client.full_name || 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No bookings yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Footer: Actions */}
        <div className="px-6 pb-6 pt-4 shrink-0">
          {isTrainerView ? (
            <button
              onClick={handleClose}
              className="w-full py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {isBooked ? (
                <button
                  onClick={() => {
                    onCancelBooking?.()
                  }}
                  className="flex-1 py-3 px-4 bg-red-500/20 border border-red-500/50 text-red-500 font-bold rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Cancel Booking
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="flex-1 py-3 px-4 bg-gray-800 text-gray-500 font-bold rounded-lg cursor-not-allowed"
                >
                  Session Full
                </button>
              ) : (
                <button
                  onClick={() => {
                    onBookSession?.()
                  }}
                  className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Book Session
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}
