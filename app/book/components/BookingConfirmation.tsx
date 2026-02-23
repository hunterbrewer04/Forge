'use client'

import type { SessionWithDetails } from '@/lib/types/sessions'

interface BookingConfirmationProps {
  session: SessionWithDetails
  guestEmail: string
  guestName: string
  onBookAnother: () => void
}

export default function BookingConfirmation({
  session,
  guestEmail,
  guestName,
  onBookAnother,
}: BookingConfirmationProps) {
  const sessionDate = new Date(session.starts_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const startTime = new Date(session.starts_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  const endTime = new Date(session.ends_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const trainerName = session.trainer?.full_name ?? 'Your Trainer'
  const firstName = guestName.split(' ')[0]
  const signupUrl = `/signup?email=${encodeURIComponent(guestEmail)}`

  return (
    <div className="px-5 py-10 flex flex-col items-center text-center min-h-[60vh] justify-center">
      {/* Success icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--facility-primary)' }}
      >
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        You&apos;re booked!
      </h1>
      <p className="text-stone-500 text-sm mb-6">See you soon, {firstName}.</p>

      {/* Session details card */}
      <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 text-left space-y-3 mb-6">
        <p className="font-semibold text-stone-900 dark:text-stone-100">{session.title}</p>
        <div className="space-y-1.5 text-sm text-stone-600 dark:text-stone-400">
          <p>{sessionDate}</p>
          <p>
            {startTime} – {endTime}
          </p>
          <p>Coach: {trainerName}</p>
          {session.location && <p>{session.location}</p>}
        </div>
      </div>

      {/* CTAs */}
      <a
        href={signupUrl}
        className="block w-full max-w-sm py-3 rounded-xl font-semibold text-sm text-white text-center mb-3"
        style={{ backgroundColor: 'var(--facility-primary)' }}
      >
        Create an Account
      </a>
      <button
        onClick={onBookAnother}
        className="w-full max-w-sm py-3 rounded-xl font-semibold text-sm text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700"
      >
        Book Another Session
      </button>

      <p className="text-xs text-stone-400 mt-4">
        Manage bookings, message your coach, and more with a free account.
      </p>

      <p className="text-xs text-stone-400 mt-2">
        Confirmation sent to {guestEmail}.
      </p>
    </div>
  )
}
