'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { PostgrestError } from '@supabase/supabase-js'

interface NextSession {
  id: string
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

// Type definitions for Supabase relation queries
interface TrainerRelation {
  full_name: string | null
}

interface SessionRelation {
  id: string
  title: string
  starts_at: string
  location?: string | null
  trainer: TrainerRelation | TrainerRelation[] | null
}

interface BookingWithSession {
  id: string
  session: SessionRelation | SessionRelation[] | null
}

export function useHomeData(): HomeData {
  const [data, setData] = useState<HomeData>({
    nextSession: null,
    recentActivity: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    async function fetchHomeData() {
      const supabase = createClient()

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Fetch next upcoming booking from bookings table
        const { data: nextBooking, error: nextError } = await supabase
          .from('bookings')
          .select(`
            id,
            session:sessions (
              id,
              title,
              starts_at,
              location,
              trainer:profiles!sessions_trainer_id_fkey (
                full_name
              )
            )
          `)
          .eq('client_id', user.id)
          .eq('status', 'confirmed')
          .gte('session.starts_at', new Date().toISOString())
          .order('session(starts_at)', { ascending: true })
          .limit(1)
          .single() as { data: BookingWithSession | null; error: PostgrestError | null }

        if (nextError && nextError.code !== 'PGRST116') {
          console.error('Error fetching next booking:', nextError)
        }

        // Fetch recent completed bookings
        const { data: recentBookings, error: recentError } = await supabase
          .from('bookings')
          .select(`
            id,
            session:sessions (
              id,
              title,
              starts_at,
              trainer:profiles!sessions_trainer_id_fkey (
                full_name
              )
            )
          `)
          .eq('client_id', user.id)
          .in('status', ['attended', 'confirmed'])
          .lte('session.starts_at', new Date().toISOString())
          .order('session(starts_at)', { ascending: false })
          .limit(5) as { data: BookingWithSession[] | null; error: PostgrestError | null }

        if (recentError) {
          console.error('Error fetching recent bookings:', recentError)
        }

        // Transform next booking data
        const nextSessionData = nextBooking?.session ? {
          id: nextBooking.id,
          title: Array.isArray(nextBooking.session)
            ? nextBooking.session[0]?.title || 'Training Session'
            : nextBooking.session.title || 'Training Session',
          start_time: Array.isArray(nextBooking.session)
            ? nextBooking.session[0]?.starts_at || ''
            : nextBooking.session.starts_at || '',
          trainer_name: Array.isArray(nextBooking.session)
            ? (Array.isArray(nextBooking.session[0]?.trainer)
                ? nextBooking.session[0]?.trainer[0]?.full_name
                : nextBooking.session[0]?.trainer?.full_name) || 'Your Trainer'
            : (Array.isArray(nextBooking.session.trainer)
                ? nextBooking.session.trainer[0]?.full_name
                : nextBooking.session.trainer?.full_name) || 'Your Trainer',
          location: Array.isArray(nextBooking.session)
            ? nextBooking.session[0]?.location || null
            : nextBooking.session.location || null
        } : null

        // Transform recent bookings data
        const recentActivityData = (recentBookings || [])
          .filter(b => b.session)
          .map(booking => {
            const session = Array.isArray(booking.session) ? booking.session[0] : booking.session
            const trainer = session?.trainer
            const trainerName = Array.isArray(trainer) ? trainer[0]?.full_name : trainer?.full_name

            return {
              id: booking.id,
              title: session?.title || 'Session',
              completed_at: session?.starts_at || '',
              type: 'session',
              trainer_name: trainerName || null
            }
          })

        setData({
          nextSession: nextSessionData,
          recentActivity: recentActivityData,
          loading: false,
          error: null
        })
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data'
        }))
      }
    }

    fetchHomeData()
  }, [])

  return data
}
