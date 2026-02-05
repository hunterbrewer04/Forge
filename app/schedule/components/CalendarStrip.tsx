'use client'

import { useState, useMemo } from 'react'
import MaterialIcon from '@/components/ui/MaterialIcon'

interface CalendarStripProps {
  selectedDate: string // ISO date string YYYY-MM-DD
  onSelectDate: (isoDate: string) => void
  datesWithSessions: Set<string> // ISO date strings that have sessions
  bookedDates?: Set<string> // ISO date strings where user has a booking
}

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay() // 0 = Sunday

  const days: { date: number; isoDate: string; isCurrentMonth: boolean }[] = []

  // Add days from previous month to fill the first week
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = daysInPrevMonth - i
    const isoDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    days.push({ date, isoDate, isCurrentMonth: false })
  }

  // Add days of current month
  for (let date = 1; date <= daysInMonth; date++) {
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    days.push({ date, isoDate, isCurrentMonth: true })
  }

  // Add days from next month to complete the grid (6 rows max)
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  const nextMonth = month === 11 ? 0 : month + 1
  const nextYear = month === 11 ? year + 1 : year

  for (let date = 1; date <= remainingDays && days.length < 42; date++) {
    const isoDate = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    days.push({ date, isoDate, isCurrentMonth: false })
  }

  return days
}

function getTodayISO(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function CalendarStrip({
  selectedDate,
  onSelectDate,
  datesWithSessions,
  bookedDates = new Set(),
}: CalendarStripProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const todayISO = getTodayISO()

  const monthDays = useMemo(
    () => getMonthData(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Limit to 5 rows if possible (35 days), otherwise 6 rows
  const visibleDays = monthDays.slice(0, monthDays.length > 35 ? 42 : 35)

  return (
    <div className="bg-bg-card rounded-2xl p-4 border border-border">
      {/* Header: Month/Year + Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="size-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          aria-label="Previous month"
        >
          <MaterialIcon name="chevron_left" size={24} />
        </button>

        <h2 className="text-base font-semibold text-text-primary">{monthName}</h2>

        <button
          onClick={handleNextMonth}
          className="size-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          aria-label="Next month"
        >
          <MaterialIcon name="chevron_right" size={24} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className="text-center text-xs font-medium text-text-muted py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {visibleDays.map((dayItem, idx) => {
          const isSelected = dayItem.isoDate === selectedDate
          const isToday = dayItem.isoDate === todayISO
          const hasSessions = datesWithSessions.has(dayItem.isoDate)
          const hasBooking = bookedDates.has(dayItem.isoDate)

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(dayItem.isoDate)}
              disabled={!dayItem.isCurrentMonth}
              className={`
                relative aspect-square flex flex-col items-center justify-center rounded-full text-sm font-medium
                transition-all duration-150
                ${!dayItem.isCurrentMonth ? 'invisible cursor-default' : ''}
                ${dayItem.isCurrentMonth && !isSelected ? 'text-text-primary hover:bg-bg-secondary' : ''}
                ${isSelected ? 'bg-primary text-white' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-primary ring-inset' : ''}
              `}
            >
              <span>{dayItem.date}</span>

              {/* Session indicator dot */}
              {dayItem.isCurrentMonth && (hasSessions || hasBooking) && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {hasSessions && (
                    <div
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-primary'
                      }`}
                    />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
