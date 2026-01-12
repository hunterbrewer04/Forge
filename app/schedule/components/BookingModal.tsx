'use client'

import { useState } from 'react'
import { X, Clock, MapPin, User, Calendar, CheckCircle, AlertCircle, Loader2 } from '@/components/ui/icons'
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
      setTimeout(() => {
        onBookingSuccess()
        onClose()
        setModalState('confirm')
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
    }
  }

  const handleRetry = () => {
    setModalState('confirm')
    setErrorMessage('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-surface-dark rounded-t-2xl p-6 animate-slide-up safe-area-bottom">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
          disabled={modalState === 'loading'}
        >
          <X size={24} />
        </button>

        {/* Confirm State */}
        {modalState === 'confirm' && (
          <>
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
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Availability</span>
                <span
                  className={`font-bold ${
                    session.availability.spots_left <= 2
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`}
                >
                  {session.availability.spots_left} of{' '}
                  {session.availability.capacity} spots left
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Book Session
              </button>
            </div>
          </>
        )}

        {/* Loading State */}
        {modalState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={48} className="text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Booking your session...</p>
          </div>
        )}

        {/* Success State */}
        {modalState === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
            <p className="text-gray-400 text-center">
              You&apos;re booked for {session.title}
            </p>
          </div>
        )}

        {/* Error State */}
        {modalState === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
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
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  )
}
