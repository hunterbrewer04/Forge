'use client'

import { useState, useEffect } from 'react'
import { getErrorMessage } from '@/lib/utils/errors'

export interface HistoryItem {
  id: string
  sessionTitle: string
  date: string
  trainerName: string | null
  sessionTypeName: string | null
  sessionTypeColor: string | null
  status: 'completed' | 'cancelled' | 'attended' | 'no_show' | 'confirmed'
  bookingCount?: number
  duration: number
  location: string | null
}

interface HistoryData {
  items: HistoryItem[]
  loading: boolean
  error: string | null
}

// API response shapes
interface ApiSessionType {
  name: string | null
  color: string | null
}

interface ApiTrainer {
  full_name: string | null
}

interface ApiSession {
  id: string
  title: string
  starts_at: string
  duration_minutes: number | null
  location: string | null
  session_type: ApiSessionType | null
  trainer: ApiTrainer | null
}

interface ApiBooking {
  id: string
  status: string
  session: ApiSession | null
}

interface ApiTrainerSession {
  id: string
  title: string
  starts_at: string
  duration_minutes: number | null
  location: string | null
  session_type: ApiSessionType | null
}

export function useHistoryData(
  userId: string | undefined,
  isTrainer: boolean,
  month: number,
  year: number
): HistoryData {
  const [data, setData] = useState<HistoryData>({
    items: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!userId) {
      setData({ items: [], loading: false, error: null })
      return
    }

    setData(prev => ({ ...prev, loading: true }))
    let isCurrent = true

    async function fetchHistory() {
      // Build date range for the selected month
      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

      try {
        if (isTrainer) {
          // Trainer: fetch sessions they own via API
          const params = new URLSearchParams({
            trainer_id: 'me',
            from: startOfMonth,
            to: endOfMonth,
            // Include all statuses by fetching without status filter — use 'scheduled' + past sessions
            status: 'scheduled',
          })

          // Fetch scheduled sessions in the date range
          const [scheduledRes, cancelledRes] = await Promise.all([
            fetch(`/api/sessions?${params}`),
            fetch(`/api/sessions?${new URLSearchParams({ trainer_id: 'me', from: startOfMonth, to: endOfMonth, status: 'cancelled' })}`),
          ])

          if (!scheduledRes.ok) throw new Error('Failed to fetch sessions')

          const scheduledData = await scheduledRes.json()
          const cancelledData = cancelledRes.ok ? await cancelledRes.json() : { sessions: [] }

          const allSessions: ApiTrainerSession[] = [
            ...(scheduledData.sessions || []),
            ...(cancelledData.sessions || []),
          ]
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())

          // Fetch booking counts per session in parallel
          const bookingCounts: Record<string, number> = {}

          if (allSessions.length > 0) {
            const countResults = await Promise.allSettled(
              allSessions.map(s =>
                fetch(`/api/sessions/${s.id}?include_bookings=true`)
                  .then(r => r.ok ? r.json() : null)
              )
            )

            for (let i = 0; i < allSessions.length; i++) {
              const result = countResults[i]
              if (result.status === 'fulfilled' && result.value?.bookings) {
                const confirmed = (result.value.bookings as Array<{ status: string }>)
                  .filter(b => b.status === 'confirmed' || b.status === 'attended').length
                bookingCounts[allSessions[i].id] = confirmed
              }
            }
          }

          if (!isCurrent) return

          const items: HistoryItem[] = allSessions.map(session => ({
            id: session.id,
            sessionTitle: session.title || 'Training Session',
            date: session.starts_at,
            trainerName: null,
            sessionTypeName: session.session_type?.name || null,
            sessionTypeColor: session.session_type?.color || null,
            status: new Date(session.starts_at) < new Date() ? 'completed' : 'confirmed',
            bookingCount: bookingCounts[session.id] || 0,
            duration: session.duration_minutes || 60,
            location: session.location || null,
          }))

          setData({ items, loading: false, error: null })
        } else {
          // Client: fetch bookings via API — get all past and present bookings
          const res = await fetch('/api/bookings?upcoming=false')
          if (!res.ok) throw new Error('Failed to fetch bookings')

          const json = await res.json()
          const allBookings: ApiBooking[] = json.data || []

          // Filter by date range and allowed statuses client-side
          const filteredBookings = allBookings.filter(b => {
            if (!b.session) return false
            const sessionDate = new Date(b.session.starts_at)
            const start = new Date(startOfMonth)
            const end = new Date(endOfMonth)
            if (sessionDate < start || sessionDate > end) return false
            return ['confirmed', 'attended', 'cancelled', 'no_show'].includes(b.status)
          })

          // Sort descending by session date
          filteredBookings.sort((a, b) =>
            new Date(b.session!.starts_at).getTime() - new Date(a.session!.starts_at).getTime()
          )

          if (!isCurrent) return

          const items: HistoryItem[] = filteredBookings.map(booking => ({
            id: booking.id,
            sessionTitle: booking.session!.title || 'Training Session',
            date: booking.session!.starts_at,
            trainerName: booking.session!.trainer?.full_name || null,
            sessionTypeName: booking.session!.session_type?.name || null,
            sessionTypeColor: booking.session!.session_type?.color || null,
            status: booking.status as HistoryItem['status'],
            duration: booking.session!.duration_minutes || 60,
            location: booking.session!.location || null,
          }))

          setData({ items, loading: false, error: null })
        }
      } catch (err) {
        if (!isCurrent) return
        setData({
          items: [],
          loading: false,
          error: getErrorMessage(err, 'Failed to load history'),
        })
      }
    }

    fetchHistory()

    return () => { isCurrent = false }
  }, [userId, isTrainer, month, year])

  return data
}
