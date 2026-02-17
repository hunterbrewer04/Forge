'use client'

import { useState, useEffect } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'

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

// Supabase FK join types
interface TrainerJoin {
  full_name: string | null
}

interface SessionTypeJoin {
  name: string | null
  color: string | null
}

interface SessionJoin {
  id: string
  title: string
  starts_at: string
  duration_minutes: number | null
  location: string | null
  trainer: TrainerJoin | TrainerJoin[] | null
  session_type: SessionTypeJoin | SessionTypeJoin[] | null
}

interface BookingRow {
  id: string
  status: string
  session: SessionJoin | SessionJoin[] | null
}

// Trainer query types
interface TrainerSessionRow {
  id: string
  title: string
  starts_at: string
  duration_minutes: number | null
  location: string | null
  session_type: SessionTypeJoin | SessionTypeJoin[] | null
}

function normalizeOne<T>(val: T | T[] | null): T | null {
  if (val == null) return null
  return Array.isArray(val) ? val[0] ?? null : val
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
      const supabase = createClient()

      // Build date range for the selected month
      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

      try {
        if (isTrainer) {
          // Trainer: query sessions they own
          const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select(`
              id,
              title,
              starts_at,
              duration_minutes,
              location,
              session_type:session_types (
                name,
                color
              )
            `)
            .eq('trainer_id', userId!)
            .gte('starts_at', startOfMonth)
            .lte('starts_at', endOfMonth)
            .order('starts_at', { ascending: false }) as {
              data: TrainerSessionRow[] | null
              error: PostgrestError | null
            }

          if (sessionsError) throw sessionsError

          // Get booking counts per session
          const sessionIds = (sessions || []).map(s => s.id)
          const bookingCounts: Record<string, number> = {}

          if (sessionIds.length > 0) {
            const { data: bookings } = await supabase
              .from('bookings')
              .select('session_id')
              .in('session_id', sessionIds)
              .in('status', ['confirmed', 'attended'])

            if (bookings) {
              for (const b of bookings) {
                bookingCounts[b.session_id] = (bookingCounts[b.session_id] || 0) + 1
              }
            }
          }

          if (!isCurrent) return

          const items: HistoryItem[] = (sessions || []).map(session => {
            const sessionType = normalizeOne(session.session_type)
            return {
              id: session.id,
              sessionTitle: session.title || 'Training Session',
              date: session.starts_at,
              trainerName: null,
              sessionTypeName: sessionType?.name || null,
              sessionTypeColor: sessionType?.color || null,
              status: new Date(session.starts_at) < new Date() ? 'completed' : 'confirmed',
              bookingCount: bookingCounts[session.id] || 0,
              duration: session.duration_minutes || 60,
              location: session.location || null,
            }
          })

          setData({ items, loading: false, error: null })
        } else {
          // Client: query bookings
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              id,
              status,
              session:sessions (
                id,
                title,
                starts_at,
                duration_minutes,
                location,
                trainer:profiles!sessions_trainer_id_fkey (
                  full_name
                ),
                session_type:session_types (
                  name,
                  color
                )
              )
            `)
            .eq('client_id', userId!)
            .in('status', ['confirmed', 'attended', 'cancelled', 'no_show'])
            .gte('session.starts_at', startOfMonth)
            .lte('session.starts_at', endOfMonth)
            .order('session(starts_at)', { ascending: false }) as {
              data: BookingRow[] | null
              error: PostgrestError | null
            }

          if (bookingsError) throw bookingsError

          if (!isCurrent) return

          const items: HistoryItem[] = (bookings || [])
            .filter(b => b.session)
            .map(booking => {
              const session = normalizeOne(booking.session)!
              const trainer = normalizeOne(session.trainer)
              const sessionType = normalizeOne(session.session_type)

              return {
                id: booking.id,
                sessionTitle: session.title || 'Training Session',
                date: session.starts_at,
                trainerName: trainer?.full_name || null,
                sessionTypeName: sessionType?.name || null,
                sessionTypeColor: sessionType?.color || null,
                status: booking.status as HistoryItem['status'],
                duration: session.duration_minutes || 60,
                location: session.location || null,
              }
            })

          setData({ items, loading: false, error: null })
        }
      } catch (err) {
        if (!isCurrent) return
        setData({
          items: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load history',
        })
      }
    }

    fetchHistory()

    return () => { isCurrent = false }
  }, [userId, isTrainer, month, year])

  return data
}
