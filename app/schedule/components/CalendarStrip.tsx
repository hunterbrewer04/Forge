'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'

interface CalendarStripProps {
  selectedDate: string // ISO date string YYYY-MM-DD
  onSelectDate: (isoDate: string) => void
  datesWithSessions: Set<string> // ISO date strings that have sessions
  bookedDates?: Set<string> // ISO date strings where user has a booking
}

function generateWeekDates(weekOffset: number): { day: string; date: number; fullDate: Date; isoDate: string }[] {
  const dates = []
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + (weekOffset * 7)) // Sunday start
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    dates.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      fullDate: d,
      isoDate: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
    })
  }
  return dates
}

function getTodayISO(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
}

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  datesWithSessions,
  bookedDates = new Set(),
}: CalendarStripProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const weekDates = generateWeekDates(weekOffset)
  const todayISO = getTodayISO()

  // Determine month/year display
  const firstDate = weekDates[0].fullDate
  const lastDate = weekDates[6].fullDate
  const monthYear = firstDate.getMonth() === lastDate.getMonth()
    ? firstDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${firstDate.toLocaleDateString('en-US', { month: 'short' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`

  // Show "Today" button if not on current week OR selected date is not today
  const showTodayButton = weekOffset !== 0 || selectedDate !== todayISO

  // Auto-scroll selected date into view
  useEffect(() => {
    if (selectedRef.current && scrollContainerRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedDate, weekOffset])

  const handlePrevWeek = () => {
    if (weekOffset > 0) {
      setWeekOffset(weekOffset - 1)
    }
  }

  const handleNextWeek = () => {
    setWeekOffset(weekOffset + 1)
  }

  const handleTodayClick = () => {
    setWeekOffset(0)
    onSelectDate(todayISO)
  }

  return (
    <div className="space-y-3">
      {/* Header: Month/Year + Navigation */}
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold text-white">{monthYear}</h2>
        <div className="flex items-center gap-2">
          {showTodayButton && (
            <button
              onClick={handleTodayClick}
              className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
            >
              Today
            </button>
          )}
          <button
            onClick={handlePrevWeek}
            disabled={weekOffset === 0}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Strip */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2 px-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {weekDates.map((dateItem) => {
          const isSelected = dateItem.isoDate === selectedDate
          const isToday = dateItem.isoDate === todayISO
          const hasSessions = datesWithSessions.has(dateItem.isoDate)
          const hasBooking = bookedDates.has(dateItem.isoDate)

          return (
            <button
              key={dateItem.isoDate}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelectDate(dateItem.isoDate)}
              className={`
                flex-shrink-0 snap-start w-14 h-20 rounded-lg flex flex-col items-center justify-center gap-1
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                    : isToday
                    ? 'bg-surface-dark border border-primary/30 text-gray-300 ring-1 ring-primary/20'
                    : 'bg-surface-dark border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }
              `}
            >
              <span className="text-xs font-medium uppercase">{dateItem.day}</span>
              <span className="text-xl font-bold">{dateItem.date}</span>

              {/* Dot indicators */}
              <div className="flex gap-1 h-1.5">
                {hasSessions && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {hasBooking && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
