'use client'

import { useState, useRef, useCallback } from 'react'
import { z } from 'zod'
import type { SessionWithDetails } from '@/lib/types/sessions'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const GuestFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone number too short').max(20, 'Phone number too long'),
})

type FormState = 'form' | 'loading' | 'error'

interface GuestBookingFormProps {
  session: SessionWithDetails
  isOpen: boolean
  onClose: () => void
  onSuccess: (bookingId: string, email: string, name: string) => void
}

export default function GuestBookingForm({
  session,
  isOpen,
  onClose,
  onSuccess,
}: GuestBookingFormProps) {
  const [formState, setFormState] = useState<FormState>('form')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)
  const dragStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return
    const delta = e.changedTouches[0].clientY - dragStartY.current
    if (delta > 100) onClose()
    dragStartY.current = null
  }

  const handleSubmit = useCallback(async () => {
    setErrors({})
    setServerError(null)

    const result = GuestFormSchema.safeParse({ fullName, email, phone })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    setFormState('loading')

    try {
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          fullName: result.data.fullName,
          email: result.data.email,
          phone: result.data.phone,
          honeypot: honeypotRef.current?.value ?? '',
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        onSuccess(data.bookingId, result.data.email, result.data.fullName)
      } else {
        // API returns { error: string, code: string }
        const code = data.code
        if (code === 'ALREADY_BOOKED') {
          setServerError('This email already has a booking for this session.')
        } else if (code === 'SESSION_FULL') {
          setServerError('This session is now full. Please choose another.')
        } else if (code === 'RATE_LIMIT_EXCEEDED') {
          setServerError('Too many booking attempts. Please try again later.')
        } else {
          setServerError(data.error ?? 'Booking failed. Please try again.')
        }
        setFormState('error')
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.')
      setFormState('error')
    }
  }, [fullName, email, phone, session.id, onSuccess])

  if (!isOpen) return null

  const sessionColor = session.session_type?.color ?? 'var(--facility-primary)'

  const sessionDate = new Date(session.starts_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-stone-900 rounded-t-2xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-300 dark:bg-stone-600 rounded-full" />
        </div>

        {/* Color accent bar */}
        <div className="h-1 mx-4 rounded-full mb-4" style={{ backgroundColor: sessionColor }} />

        <div className="px-5 pb-6">
          {/* Session summary */}
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
            {session.title}
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            {sessionDate} · {formatTime(session.starts_at)}
          </p>

          {formState === 'error' && serverError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-900">
              <p className="text-sm text-red-700 dark:text-red-400">{serverError}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                disabled={formState === 'loading'}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[--facility-primary] disabled:opacity-50"
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                disabled={formState === 'loading'}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[--facility-primary] disabled:opacity-50"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                disabled={formState === 'loading'}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[--facility-primary] disabled:opacity-50"
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Honeypot — hidden from real users with CSS, visible to bots */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }}>
              <input
                ref={honeypotRef}
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={formState === 'loading'}
            className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60 active:scale-[0.98] transition-transform"
            style={{ backgroundColor: 'var(--facility-primary)' }}
          >
            {formState === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Booking...
              </span>
            ) : formState === 'error' ? (
              'Try Again'
            ) : (
              'Confirm Booking'
            )}
          </button>

          <p className="text-xs text-stone-400 text-center mt-3">
            No account needed. We&apos;ll only use your info for this booking.
          </p>
        </div>
      </div>
    </>
  )
}
