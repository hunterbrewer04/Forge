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

  // Determine color
  const getColor = () => {
    if (user_booking) return '#22c55e' // green for booked
    if (is_premium) return '#fbbf24' // gold for premium
    return session_type?.color || '#ff6714' // type color or default orange
  }

  const color = getColor()

  // Determine card variant
  const isBooked = !!user_booking
  const isFull = availability.is_full && !user_booking

  // Format time
  const startTime = new Date(session.starts_at)
  const hours12 = startTime.getHours() % 12 || 12
  const mins = String(startTime.getMinutes()).padStart(2, '0')
  const timeHour = `${hours12}:${mins}`
  const timePeriod = startTime.getHours() < 12 ? 'AM' : 'PM'

  return (
    <div
      className={`
        relative bg-[#232323] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all
        active:scale-[0.98] duration-100
        ${isFull ? 'opacity-60' : ''}
        ${isBooked ? 'bg-green-500/5' : ''}
        ${is_premium ? 'bg-gradient-to-br from-yellow-500/10 to-[#232323]' : ''}
      `}
    >
      {/* Left color indicator */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Badges */}
      {isBooked && (
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium rounded-full">
          Booked
        </div>
      )}
      {is_premium && !isBooked && (
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full">
          Premium
        </div>
      )}

      {/* Card content */}
      <div className="flex items-start gap-3 p-4 pl-5">
        {/* Time block */}
        <div
          className="min-w-[3.5rem] flex flex-col items-center cursor-pointer"
          onClick={onTap}
        >
          <div className="text-2xl font-bold text-white leading-tight">
            {timeHour}
          </div>
          <div className="text-xs text-stone-500 uppercase">
            {timePeriod}
          </div>
        </div>

        {/* Main content */}
        <div
          className="flex-1 flex flex-col gap-2 cursor-pointer"
          onClick={onTap}
        >
          {/* Title */}
          <h3 className="text-base font-bold text-white leading-tight">
            {session.title}
          </h3>

          {/* Duration & Spots */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Duration pill */}
            <div className="flex items-center gap-1 bg-white/5 text-stone-400 text-xs px-2.5 py-1 rounded-full">
              <Clock size={12} />
              <span>{session.duration_minutes}min</span>
            </div>

            {/* Spots indicator - dots for capacity <= 10 */}
            {availability.capacity <= 10 ? (
              <div className="flex gap-1">
                {Array.from({ length: availability.capacity }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < availability.booked_count ? 'bg-primary' : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
            ) : (
              <span className={`text-xs ${
                isFull ? 'text-red-400' :
                availability.spots_left <= 2 ? 'text-yellow-400' :
                'text-stone-400'
              }`}>
                {isFull ? 'Full' : `${availability.spots_left} spot${availability.spots_left !== 1 ? 's' : ''} left`}
              </span>
            )}
          </div>

          {/* Trainer */}
          {trainer && (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 w-fit">
              {trainer.avatar_url ? (
                <img
                  src={trainer.avatar_url}
                  alt={trainer.full_name || 'Trainer'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center">
                  <User size={14} className="text-stone-400" />
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
              className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center hover:bg-green-500/25 transition-colors"
              aria-label="Cancel booking"
            >
              <Check size={20} className="text-green-500" />
            </button>
          ) : isFull ? (
            <button
              disabled
              className="w-11 h-11 rounded-xl bg-stone-800 flex items-center justify-center cursor-not-allowed"
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
              className="w-11 h-11 rounded-xl bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors active:scale-95"
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
