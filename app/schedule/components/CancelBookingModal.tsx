'use client'

import { useState, useRef, useEffect } from 'react'
import { X, AlertTriangle, CheckCircle, Loader2 } from '@/components/ui/icons'
import type { SessionWithDetails } from '@/lib/types/sessions'

interface CancelBookingModalProps {
  session: SessionWithDetails
  bookingId: string
  isOpen: boolean
  onClose: () => void
  onCancelSuccess: () => void
}

type ModalState = 'confirm' | 'loading' | 'success' | 'error'

export default function CancelBookingModal({
  session,
  bookingId,
  isOpen,
  onClose,
  onCancelSuccess,
}: CancelBookingModalProps) {
  const [modalState, setModalState] = useState<ModalState>('confirm')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Refs for cleanup - prevent state updates after unmount
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleCancel = async () => {
    setModalState('loading')
    setErrorMessage('')

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellation_reason: 'Cancelled by user',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      setModalState('success')
      // Call success callback after a brief delay to show success state
      // Guard with mounted check to prevent state updates after unmount
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        onCancelSuccess()
        onClose()
        setModalState('confirm')
      }, 1500)
    } catch (error) {
      setModalState('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to cancel booking'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-surface-dark rounded-2xl p-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
          disabled={modalState === 'loading'}
        >
          <X size={20} />
        </button>

        {/* Confirm State */}
        {modalState === 'confirm' && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} className="text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Cancel Booking?
              </h3>
              <p className="text-gray-400">
                Are you sure you want to cancel your booking for{' '}
                <span className="text-white font-medium">{session.title}</span>?
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {formatDateTime(session.starts_at)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Loading State */}
        {modalState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Cancelling booking...</p>
          </div>
        )}

        {/* Success State */}
        {modalState === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Booking Cancelled
            </h3>
            <p className="text-gray-400 text-center text-sm">
              Your booking has been cancelled successfully.
            </p>
          </div>
        )}

        {/* Error State */}
        {modalState === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Cancellation Failed
            </h3>
            <p className="text-gray-400 text-center text-sm mb-4">
              {errorMessage}
            </p>
            <button
              onClick={handleClose}
              className="py-2 px-6 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
