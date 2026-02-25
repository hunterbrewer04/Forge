'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { useHistoryData } from '@/lib/hooks/useHistoryData'
import { HistorySkeleton } from '@/components/skeletons/HistorySkeleton'
import { ChevronLeft, ChevronRight, Dumbbell, CalendarOff, Users } from '@/components/ui/icons'

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  attended: { label: 'ATTENDED', bg: 'bg-success/10', text: 'text-success' },
  completed: { label: 'COMPLETED', bg: 'bg-success/10', text: 'text-success' },
  confirmed: { label: 'UPCOMING', bg: 'bg-primary/10', text: 'text-primary' },
  cancelled: { label: 'CANCELLED', bg: 'bg-red-500/10', text: 'text-red-500' },
  no_show: { label: 'NO SHOW', bg: 'bg-amber-500/10', text: 'text-amber-500' },
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const date = d.getDate()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${day}, ${month} ${date} @ ${time}`
}

export default function HistoryPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  const { items, loading: loadingHistory, error } = useHistoryData(
    user?.id,
    !!profile?.is_trainer,
    currentMonth,
    currentYear
  )

  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  if (loading || !user) {
    return (
      <MobileLayout title="Training History" showBack>
        <HistorySkeleton />
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Training History" showBack>
      {/* Month Picker */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={goToPrevMonth}
          className="size-9 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-text-primary font-semibold">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          className="size-9 flex items-center justify-center rounded-lg bg-bg-card border border-border text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Content */}
      {loadingHistory ? (
        <HistorySkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center bg-bg-card border border-border rounded-xl p-8 text-center mt-4">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-bg-card border border-border rounded-xl p-8 text-center mt-4">
          <div className="bg-bg-secondary p-4 rounded-full mb-3">
            <CalendarOff size={32} className="text-text-muted" />
          </div>
          <h3 className="text-text-primary font-medium mb-1">No Sessions</h3>
          <p className="text-text-secondary text-sm">
            No sessions found for {monthLabel}
          </p>
        </div>
      ) : (
        <div className="space-y-2 mt-2">
          {items.map(item => {
            const style = STATUS_STYLES[item.status] || STATUS_STYLES.confirmed
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
              >
                {/* Icon */}
                <div
                  className={`size-10 rounded-full flex items-center justify-center shrink-0 ${item.sessionTypeColor ? '' : 'bg-bg-secondary'}`}
                  style={item.sessionTypeColor ? { backgroundColor: `${item.sessionTypeColor}20` } : undefined}
                >
                  <Dumbbell
                    size={20}
                    style={item.sessionTypeColor ? { color: item.sessionTypeColor } : undefined}
                    className={item.sessionTypeColor ? '' : 'text-primary'}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-text-primary font-medium text-sm truncate">
                    {item.sessionTitle}
                  </h4>
                  <p className="text-text-muted text-xs truncate">
                    {formatSessionDate(item.date)}
                    {item.trainerName && ` \u2022 ${item.trainerName}`}
                  </p>
                </div>

                {/* Status + booking count */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  {item.bookingCount !== undefined && profile?.is_trainer && (
                    <span className="text-text-muted text-[10px] flex items-center gap-0.5">
                      <Users size={10} />
                      {item.bookingCount}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MobileLayout>
  )
}
