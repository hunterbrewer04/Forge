'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Clock, MapPin, User, Calendar, CheckCircle, AlertCircle, Loader2 } from '@/components/ui/icons'
import { toast } from 'sonner'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import type { SessionWithDetails } from '@/lib/types/sessions'

interface BookingModalProps {
  session: SessionWithDetails
  isOpen: boolean
  onClose: () => void
  onBookingSuccess: () => void
}

type ModalState = 'confirm' | 'loading' | 'success' | 'error'

export default function BookingModal({
  session,
  isOpen,
  onClose,
  onBookingSuccess,
}: BookingModalProps) {
  const [modalState, setModalState] = useState<ModalState>('confirm')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [translateY, setTranslateY] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)

  // Refs for cleanup - prevent state updates after unmount
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDesktop = useIsDesktop()

  // Track mounted state and cleanup timeouts
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

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

  const handleBook = async () => {
    setModalState('loading')
    setErrorMessage('')

    try {
      const response = await fetch(`/api/sessions/${session.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book session')
      }

      setModalState('success')
      // Call success callback after a brief delay to show success state
      // Guard with mounted check to prevent state updates after unmount
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        onBookingSuccess()
        onClose()
        setModalState('confirm')
        toast.success('Booking confirmed!', {
          description: `You're booked for ${session.title}`,
        })
      }, 1500)
    } catch (error) {
      setModalState('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to book session'
      )
    }
  }

  const handleClose = () => {
    if (modalState !== 'loading') {
      onClose()
      setModalState('confirm')
      setErrorMessage('')
      setTranslateY(0)
    }
  }

  const handleRetry = () => {
    setModalState('confirm')
    setErrorMessage('')
  }

  // Swipe-to-dismiss handlers — only trigger when scroll is at top
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const delta = currentY - touchStartY
    // Only allow downward swipes when scrollable body is at top
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

  return (
    <div className={`fixed inset-0 z-[70] flex justify-center ${isDesktop ? 'items-center p-4' : 'items-end'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full max-h-[85dvh] flex flex-col ${
          isDesktop
            ? 'max-w-xl bg-surface-dark rounded-2xl animate-scale-up'
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

        {/* Header: Drag Handle + Close Button */}
        {!isDesktop && (
          <div className="px-6 pt-2 shrink-0">
            <div className="flex justify-center pb-3">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
          disabled={modalState === 'loading'}
        >
          <X size={24} />
        </button>

        {/* Confirm State */}
        {modalState === 'confirm' && (
          <>
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
            </div>

            {/* Pinned Footer: Actions */}
            <div className="px-6 pb-6 pt-4 shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                {session.availability.is_full ? (
                  <button
                    disabled
                    className="flex-1 py-3 px-4 bg-gray-800 text-gray-500 font-bold rounded-lg cursor-not-allowed"
                  >
                    Session Full
                  </button>
                ) : (
                  <button
                    onClick={handleBook}
                    className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90"
                  >
                    Book Session
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {modalState === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 pb-6">
            <Loader2 size={48} className="text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Booking your session...</p>
          </div>
        )}

        {/* Success State */}
        {modalState === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 pb-6">
            <svg className="w-16 h-16 mb-4" viewBox="0 0 52 52">
              <circle className="animate-checkmark-circle" cx="26" cy="26" r="25" fill="none" stroke="#22c55e" strokeWidth="2" />
              <path className="animate-checkmark" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
            <p className="text-gray-400 text-center">
              You&apos;re booked for {session.title}
            </p>
          </div>
        )}

        {/* Error State */}
        {modalState === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 pb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Booking Failed</h3>
            <p className="text-gray-400 text-center mb-6">{errorMessage}</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}
