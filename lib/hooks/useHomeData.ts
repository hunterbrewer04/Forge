'use client'

import { useState, useEffect } from 'react'
import { getErrorMessage } from '@/lib/utils/errors'

interface NextSession {
  id: string
  session_id: string
  title: string
  start_time: string
  trainer_name: string
  location: string | null
}

interface RecentActivity {
  id: string
  title: string
  completed_at: string
  type: string
  trainer_name: string | null
}

interface HomeData {
  nextSession: NextSession | null
  recentActivity: RecentActivity[]
  loading: boolean
  error: string | null
}

// API response shapes
interface ApiSession {
  id: string
  title: string
  starts_at: string
  location: string | null
  trainer: { full_name: string | null } | null
}

interface ApiBooking {
  id: string
  status: string
  session: ApiSession | null
}

export function useHomeData(userId: string | undefined): HomeData {
  const [data, setData] = useState<HomeData>({
    nextSession: null,
    recentActivity: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!userId) {
      setData(prev => ({ ...prev, loading: false }))
      return
    }

    setData(prev => ({ ...prev, loading: true }))

    let isCurrent = true

    async function fetchHomeData() {
      try {
        // Fetch next upcoming confirmed booking and recent past bookings in parallel
        const [upcomingRes, recentRes] = await Promise.all([
          fetch('/api/bookings?status=confirmed&upcoming=true'),
          fetch('/api/bookings?upcoming=false'),
        ])

        if (!upcomingRes.ok) {
          console.error('Error fetching upcoming bookings:', await upcomingRes.text())
        }
        if (!recentRes.ok) {
          console.error('Error fetching recent bookings:', await recentRes.text())
        }

        const upcomingJson = upcomingRes.ok ? await upcomingRes.json() : { data: [] }
        const recentJson = recentRes.ok ? await recentRes.json() : { data: [] }

        const upcomingBookings: ApiBooking[] = upcomingJson.data || []
        const recentBookings: ApiBooking[] = recentJson.data || []

        // Next session: first upcoming confirmed booking with a future session
        const now = new Date()
        const nextBooking = upcomingBookings
          .filter(b => b.session && new Date(b.session.starts_at) >= now)
          .sort((a, b) =>
            new Date(a.session!.starts_at).getTime() - new Date(b.session!.starts_at).getTime()
          )[0] ?? null

        const nextSessionData: NextSession | null = nextBooking?.session
          ? {
              id: nextBooking.id,
              session_id: nextBooking.session.id,
              title: nextBooking.session.title || 'Training Session',
              start_time: nextBooking.session.starts_at,
              trainer_name: nextBooking.session.trainer?.full_name || 'Your Trainer',
              location: nextBooking.session.location || null,
            }
          : null

        // Recent activity: past attended or confirmed sessions, limited to 5
        const recentActivityData: RecentActivity[] = recentBookings
          .filter(b => b.session && ['attended', 'confirmed'].includes(b.status))
          .filter(b => new Date(b.session!.starts_at) <= now)
          .sort((a, b) =>
            new Date(b.session!.starts_at).getTime() - new Date(a.session!.starts_at).getTime()
          )
          .slice(0, 5)
          .map(booking => ({
            id: booking.id,
            title: booking.session!.title || 'Session',
            completed_at: booking.session!.starts_at,
            type: 'session',
            trainer_name: booking.session!.trainer?.full_name || null,
          }))

        if (!isCurrent) return

        setData({
          nextSession: nextSessionData,
          recentActivity: recentActivityData,
          loading: false,
          error: null
        })
      } catch (err) {
        if (!isCurrent) return

        setData(prev => ({
          ...prev,
          loading: false,
          error: getErrorMessage(err, 'Failed to load data')
        }))
      }
    }

    fetchHomeData()

    return () => { isCurrent = false }
  }, [userId])

  return data
}
