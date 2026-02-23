'use client'

import type { SessionWithDetails } from '@/lib/types/sessions'
import { Dumbbell, User, type LucideIcon } from '@/components/ui/icons'
import Image from 'next/image'

interface SessionCardProps {
  session: SessionWithDetails
  userId?: string
  isTrainer?: boolean
  publicMode?: boolean
  onBook: () => void
  onCancel: () => void
  onTap: () => void
  onDetails?: () => void
}

export default function SessionCard({ session, userId, isTrainer, publicMode, onBook, onCancel, onTap, onDetails }: SessionCardProps) {
  const { trainer, availability, user_booking } = session

  // Determine card state
  const isBooked = !publicMode && !!user_booking
  const isFull = availability.is_full && !user_booking

  // Format time
  const startTime = new Date(session.starts_at)
  const endTime = new Date(startTime.getTime() + session.duration_minutes * 60000)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`

  // Get session icon based on type - all session types use Dumbbell
  const SessionIcon: LucideIcon = Dumbbell

  // Spots display
  const spotsText = isFull
    ? 'Full'
    : availability.spots_left === 1
    ? 'LAST SPOT!'
    : `${availability.spots_left} SPOTS LEFT`

  const spotsColor = isFull
    ? 'text-error'
    : availability.spots_left <= 2
    ? 'text-warning'
    : 'text-primary'

  return (
    <div
      className={`
        bg-bg-card border border-border rounded-xl p-4 transition-[border-color,opacity]
        ${isFull ? 'opacity-60' : ''}
        ${isBooked ? 'border-success/30 bg-success/5' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Session Type Icon */}
        <div className="bg-bg-secondary p-3 rounded-xl shrink-0">
          <SessionIcon size={24} className="text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onTap}>
          {/* Title */}
          <h3 className="text-text-primary font-semibold text-base truncate">
            {session.title}
          </h3>

          {/* Time */}
          <p className="text-text-secondary text-sm mt-0.5">{timeRange}</p>

          {/* Trainer & Spots */}
          <div className="flex items-center gap-2 mt-2">
            {trainer && (
              <div className="flex items-center gap-1.5">
                {trainer.avatar_url ? (
                  <Image
                    src={trainer.avatar_url}
                    alt={trainer.full_name || 'Trainer'}
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-bg-secondary flex items-center justify-center">
                    <User size={14} className="text-text-muted" />
                  </div>
                )}
                <span className="text-text-secondary text-sm truncate max-w-[100px]">
                  {trainer.full_name?.split(' ')[0] || 'Coach'}
                </span>
              </div>
            )}

            <span className="text-text-muted">&bull;</span>

            <span className={`text-xs font-semibold shrink-0 ${spotsColor}`}>
              {spotsText}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          {publicMode ? (
            availability.is_full ? (
              <button
                disabled
                className="px-4 py-2 bg-bg-secondary text-text-muted rounded-full text-sm font-semibold cursor-not-allowed"
                aria-label="Session full"
              >
                Full
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onBook()
                }}
                className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-transform active:scale-95"
                aria-label="Book session"
              >
                Book
              </button>
            )
          ) : isTrainer ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDetails?.()
              }}
              className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-colors"
              aria-label="View session details"
            >
              Details
            </button>
          ) : isBooked ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDetails?.()
              }}
              className="px-4 py-2 bg-success/10 border border-success/30 text-success rounded-full text-sm font-semibold hover:bg-success/20 transition-colors"
              aria-label="View booking details"
            >
              Details
            </button>
          ) : isFull ? (
            <button
              disabled
              className="px-4 py-2 bg-bg-secondary text-text-muted rounded-full text-sm font-semibold cursor-not-allowed"
              aria-label="Session full"
            >
              Full
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onBook()
              }}
              className="px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary/90 transition-transform active:scale-95"
              aria-label="Book session"
            >
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
