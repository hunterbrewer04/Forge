'use client'

import { useState, useRef, useEffect } from 'react'
import { X, User, Users } from '@/components/ui/icons'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import type { SessionWithDetails } from '@/modules/calendar-booking/types'
import SessionInfoBlock from './SessionInfoBlock'
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
            ? 'max-w-xl bg-bg-card rounded-2xl animate-scale-up'
            : 'max-w-md bg-bg-card rounded-t-2xl animate-slide-up safe-area-bottom'
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
          className={`absolute top-0 left-0 right-0 ${isDesktop ? 'h-1.5 rounded-t-2xl' : 'h-1'}`}
          style={{ backgroundColor: session.session_type?.color || '#ff6714' }}
        />

        {/* Header: Drag Handle */}
        {!isDesktop && (
          <div className="px-6 pt-2 shrink-0">
            <div className="flex justify-center pb-3">
              <div className="w-10 h-1 bg-text-muted/50 rounded-full" />
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 size-8 flex items-center justify-center bg-bg-secondary border border-border rounded-full text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors z-10"
        >
          <X size={16} />
        </button>

        {/* Scrollable Body */}
        <div ref={scrollRef} className={`flex-1 overflow-y-auto px-6 min-h-0 ${isDesktop ? 'pt-6' : ''}`}>
          <SessionInfoBlock session={session} />

          {/* Trainer View: Booked Members */}
          {isTrainerView && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-primary" />
                <span className="text-text-primary font-semibold">Booked Members</span>
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
                        <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center">
                          <User size={16} className="text-text-muted" />
                        </div>
                      )}
                      <span className="text-text-secondary">
                        {booking.client.full_name || 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-text-muted text-sm">
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
              className="w-full py-3 px-4 bg-bg-secondary text-text-primary font-bold rounded-lg hover:bg-bg-secondary/80 transition-colors"
            >
              Close
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-bg-secondary text-text-primary font-bold rounded-lg hover:bg-bg-secondary/80 transition-colors"
              >
                Close
              </button>
              {isBooked ? (
                <button
                  onClick={() => {
                    onCancelBooking?.()
                  }}
                  className="flex-1 py-3 px-4 bg-error/10 border border-error/30 text-error font-bold rounded-lg hover:bg-error/20 transition-colors"
                >
                  Cancel Booking
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="flex-1 py-3 px-4 bg-bg-secondary text-text-muted font-bold rounded-lg cursor-not-allowed"
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
