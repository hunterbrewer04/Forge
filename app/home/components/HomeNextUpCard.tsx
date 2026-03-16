'use client'

import { useMemo } from 'react'
import { Clock, MapPin, User, ChevronRight } from '@/components/ui/icons'
import { useCountdown } from '@/lib/hooks/useCountdown'
import { formatSessionTime } from '@/lib/utils/date'

interface NextSession {
  id: string
  session_id: string
  title: string
  start_time: string
  trainer_name: string
  location: string | null
}

interface HomeNextUpCardProps {
  session: NextSession
  onViewDetails: () => void
}

export default function HomeNextUpCard({ session, onViewDetails }: HomeNextUpCardProps) {
  const { countdown, status } = useCountdown(session.start_time)
  const sessionTime = useMemo(() => formatSessionTime(session.start_time), [session.start_time])

  return (
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary via-orange-500 to-amber-500">
      <div className="bg-bg-card rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-3">
              NEXT UP
            </div>
            <h3 className="text-text-primary font-bold text-lg leading-tight mb-3">
              {session.title}
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Clock size={16} className="text-text-muted" />
                <span>{sessionTime}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <User size={16} className="text-text-muted" />
                <span>{session.trainer_name}</span>
              </div>

              {session.location && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin size={16} className="text-text-muted" />
                  <span>{session.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Countdown badge */}
          <div className={`
            px-3 py-2 rounded-lg font-semibold whitespace-nowrap ml-3
            ${status === 'in-progress'
              ? 'bg-success/15 text-success shadow-lg shadow-success/20'
              : status === 'soon'
              ? 'bg-warning/15 text-warning animate-pulse'
              : 'bg-bg-secondary text-text-secondary'}
          `}>
            <div className="text-3xl font-bold">{countdown || '...'}</div>
          </div>
        </div>

        {/* Action */}
        <button
          onClick={onViewDetails}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-bg-secondary border border-border text-text-primary rounded-lg font-medium text-sm hover:bg-bg-secondary/80 transition-colors"
        >
          View Details
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
