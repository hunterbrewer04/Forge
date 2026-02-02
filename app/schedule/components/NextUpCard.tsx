'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { SessionWithDetails } from '@/lib/types/sessions'
import { Clock, User, ChevronRight } from '@/components/ui/icons'

interface NextUpCardProps {
  session: SessionWithDetails
  onCancel: () => void
  onViewDetails: () => void
}

export default function NextUpCard({ session, onCancel, onViewDetails }: NextUpCardProps) {
  const [countdown, setCountdown] = useState<string>('')
  const [status, setStatus] = useState<'upcoming' | 'soon' | 'in-progress'>('upcoming')

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const startTime = new Date(session.starts_at)
      const diffMs = startTime.getTime() - now.getTime()

      if (diffMs < 0) {
        setCountdown('In progress')
        setStatus('in-progress')
        return
      }

      const diffMinutes = Math.floor(diffMs / 1000 / 60)

      if (diffMinutes < 5) {
        setCountdown('Starting soon')
        setStatus('soon')
        return
      }

      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 0) {
        const remainingHours = diffHours % 24
        setCountdown(`${diffDays}d ${remainingHours}h`)
      } else if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60
        setCountdown(`${diffHours}h ${remainingMinutes}m`)
      } else {
        setCountdown(`${diffMinutes}m`)
      }

      setStatus('upcoming')
    }

    // Initial update
    updateCountdown()

    // Update every minute
    const interval = setInterval(updateCountdown, 60000)

    return () => clearInterval(interval)
  }, [session.starts_at])

  const borderColor = session.session_type?.color || '#ff6714'
  const trainerName = session.trainer?.full_name || 'Trainer TBD'
  const trainerAvatar = session.trainer?.avatar_url

  return (
    <div
      className="bg-[#2a2a2a] rounded-xl p-4 shadow-md"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
            NEXT UP
          </p>
          <h3 className="text-white font-bold text-lg leading-tight mb-2">
            {session.title}
          </h3>

          {/* Session details */}
          <div className="space-y-1.5">
            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Clock size={16} className="text-stone-500" />
              <span>
                {new Date(session.starts_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>

            {/* Trainer */}
            <div className="flex items-center gap-2 text-sm text-stone-400">
              {trainerAvatar ? (
                <div className="relative w-4 h-4 rounded-full overflow-hidden">
                  <Image
                    src={trainerAvatar}
                    alt={trainerName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <User size={16} className="text-stone-500" />
              )}
              <span>{trainerName}</span>
            </div>
          </div>
        </div>

        {/* Countdown badge */}
        <div className={`
          px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ml-3
          ${status === 'in-progress' ? 'bg-green-500/10 text-green-400' :
            status === 'soon' ? 'bg-primary/10 text-primary' :
            'bg-stone-700/50 text-stone-300'}
        `}>
          {countdown || 'Loading...'}
        </div>
      </div>

      {/* Location if available */}
      {session.location && (
        <div className="mb-3 text-sm text-stone-500">
          {session.location}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onViewDetails}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent border border-stone-600 text-white rounded-lg font-medium text-sm hover:bg-stone-800/50 transition-colors"
        >
          Details
          <ChevronRight size={16} />
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-lg font-medium text-sm hover:bg-red-500/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
