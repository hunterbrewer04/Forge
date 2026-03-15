'use client'

import { Clock, MapPin, User, Calendar } from '@/components/ui/icons'
import { formatSessionTime, formatSessionDate } from '@/lib/utils/date'
import type { SessionWithDetails } from '@/modules/calendar-booking/types'

interface SessionInfoBlockProps {
  session: SessionWithDetails
}

export default function SessionInfoBlock({ session }: SessionInfoBlockProps) {
  return (
    <>
      {/* Title & Type */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-2">
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

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-[10px] bg-primary/8 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider">Date</div>
              <div className="text-sm text-text-primary font-medium">{formatSessionDate(session.starts_at)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-9 rounded-[10px] bg-primary/8 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-primary" />
            </div>
            <div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider">Time</div>
              <div className="text-sm text-text-primary font-medium">
                {formatSessionTime(session.starts_at)} - {formatSessionTime(session.ends_at)}
                <span className="text-text-muted ml-2">
                  ({session.duration_minutes} min)
                </span>
              </div>
            </div>
          </div>

          {session.location && (
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-[10px] bg-primary/8 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Location</div>
                <div className="text-sm text-text-primary font-medium">{session.location}</div>
              </div>
            </div>
          )}

          {session.trainer && (
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-[10px] bg-primary/8 flex items-center justify-center shrink-0">
                <User size={18} className="text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Coach</div>
                <div className="text-sm text-text-primary font-medium">{session.trainer.full_name || 'Trainer'}</div>
              </div>
            </div>
          )}
        </div>

        {session.description && (
          <p className="mt-4 text-sm text-text-secondary">{session.description}</p>
        )}
      </div>

      {/* Availability */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-text-secondary">Availability</span>
          <span
            className={`font-bold ${
              session.availability.spots_left <= 2
                ? 'text-warning'
                : 'text-success'
            }`}
          >
            {session.availability.spots_left} of{' '}
            {session.availability.capacity} {session.availability.spots_left === 1 ? 'spot' : 'spots'} left
          </span>
        </div>

        {session.availability.capacity <= 10 ? (
          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: session.availability.capacity }).map((_, i) => {
              const bookedCount = session.availability.capacity - session.availability.spots_left
              const isFilled = i < bookedCount
              return (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    isFilled ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )
            })}
          </div>
        ) : (
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${
                  ((session.availability.capacity - session.availability.spots_left) /
                    session.availability.capacity) *
                  100
                }%`,
              }}
            />
          </div>
        )}
      </div>
    </>
  )
}
