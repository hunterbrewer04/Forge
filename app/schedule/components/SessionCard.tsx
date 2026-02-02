'use client'

import type { SessionWithDetails } from '@/lib/types/sessions'
import { Plus, Check, Lock, User, Clock } from '@/components/ui/icons'

interface SessionCardProps {
  session: SessionWithDetails
  onBook: () => void
  onCancel: () => void
  onTap: () => void // navigates to detail page
}

export default function SessionCard({ session, onBook, onCancel, onTap }: SessionCardProps) {
  const { session_type, trainer, availability, user_booking, is_premium } = session

  // Determine left border color
  const getBorderColor = () => {
    if (user_booking) return '#22c55e' // green for booked
    if (is_premium) return '#fbbf24' // gold for premium
    return session_type?.color || '#ff6714' // type color or default orange
  }

  // Calculate capacity percentage for color coding
  const capacityPercent = availability.capacity > 0
    ? (availability.booked_count / availability.capacity) * 100
    : 0

  const getCapacityColor = () => {
    if (capacityPercent >= 80) return 'bg-red-500'
    if (capacityPercent >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Determine card variant
  const isBooked = !!user_booking
  const isFull = availability.is_full && !user_booking

  // Format time
  const startTime = new Date(session.starts_at)
  const hours = String(startTime.getHours()).padStart(2, '0')
  const mins = String(startTime.getMinutes()).padStart(2, '0')
  const timeHour = `${hours}:${mins}`
  const timePeriod = startTime.getHours() < 12 ? 'AM' : 'PM'

  return (
    <div
      className={`
        relative bg-stone-900 rounded-lg overflow-hidden
        active:scale-[0.98] transition-transform duration-100
        ${isFull ? 'opacity-60' : ''}
        ${isBooked ? 'bg-green-500/5' : ''}
        ${is_premium ? 'bg-gradient-to-br from-yellow-500/10 to-stone-900' : ''}
      `}
      style={{ borderLeft: `4px solid ${getBorderColor()}` }}
    >
      {/* Capacity bar */}
      <div className="h-1 bg-stone-800 w-full">
        <div
          className={`h-full transition-all duration-300 ${getCapacityColor()}`}
          style={{ width: `${capacityPercent}%` }}
        />
      </div>

      {/* Badges */}
      {isBooked && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
          Booked
        </div>
      )}
      {is_premium && !isBooked && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-stone-900 text-xs font-bold rounded">
          Premium
        </div>
      )}

      {/* Card content */}
      <div className="flex items-start gap-3 p-4">
        {/* Time block */}
        <div
          className="min-w-[3.5rem] flex flex-col items-center cursor-pointer"
          onClick={onTap}
        >
          <div className="text-lg font-semibold text-white leading-tight">
            {timeHour}
          </div>
          <div className="text-xs text-stone-400 uppercase">
            {timePeriod}
          </div>
        </div>

        {/* Main content */}
        <div
          className="flex-1 flex flex-col gap-2 cursor-pointer"
          onClick={onTap}
        >
          {/* Title */}
          <h3 className="text-base font-semibold text-white leading-tight">
            {session.title}
          </h3>

          {/* Duration & Spots */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Duration pill */}
            <div className="flex items-center gap-1 px-2 py-0.5 bg-stone-800 rounded text-xs text-stone-300">
              <Clock size={12} />
              <span>{session.duration_minutes}min</span>
            </div>

            {/* Spots info */}
            <div className={`text-xs ${
              isFull ? 'text-red-400' :
              availability.spots_left <= 2 ? 'text-yellow-400' :
              'text-stone-400'
            }`}>
              {isFull ? 'Full' : `${availability.spots_left} spot${availability.spots_left !== 1 ? 's' : ''} left`}
            </div>
          </div>

          {/* Trainer */}
          {trainer && (
            <div className="flex items-center gap-2">
              {trainer.avatar_url ? (
                <img
                  src={trainer.avatar_url}
                  alt={trainer.full_name || 'Trainer'}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center">
                  <User size={16} className="text-stone-400" />
                </div>
              )}
              <span className="text-sm text-stone-300">
                {trainer.full_name || 'Trainer'}
              </span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="self-center">
          {isBooked ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center hover:bg-green-500/30 transition-colors"
              aria-label="Cancel booking"
            >
              <Check size={20} className="text-green-500" />
            </button>
          ) : isFull ? (
            <button
              disabled
              className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center cursor-not-allowed"
              aria-label="Session full"
            >
              <Lock size={20} className="text-stone-500" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onBook()
              }}
              className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Book session"
            >
              <Plus size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
