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

  const trainerName = session.trainer?.full_name || 'Trainer TBD'
  const trainerAvatar = session.trainer?.avatar_url

  return (
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary via-orange-500 to-amber-500">
      <div className="bg-surface-deep rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-3">
              NEXT UP
            </div>
            <h3 className="text-white font-bold text-lg leading-tight mb-3">
              {session.title}
            </h3>

            {/* Session details */}
            <div className="space-y-2">
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
            px-3 py-2 rounded-lg font-semibold whitespace-nowrap ml-3
            ${status === 'in-progress'
              ? 'bg-green-500/15 text-green-400 shadow-lg shadow-green-500/20'
              : status === 'soon'
              ? 'bg-orange-500/15 text-orange-400 animate-pulse'
              : 'bg-stone-700/50 text-stone-300'}
          `}>
            <div className="text-3xl font-bold">{countdown || '...'}</div>
          </div>
        </div>

        {/* Location if available */}
        {session.location && (
          <div className="mb-4 text-sm text-stone-500">
            {session.location}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium text-sm hover:bg-white/10 transition-colors"
          >
            Details
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg font-medium text-sm hover:bg-red-500/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
