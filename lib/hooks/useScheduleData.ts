'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { SessionWithDetails, SessionType } from '@/lib/types/sessions'
import { getLocalDateString } from '@/lib/utils/date'

interface UseScheduleDataParams {
  userId: string | undefined
  fromDate?: string
  toDate?: string
}

interface UseScheduleDataReturn {
  sessions: SessionWithDetails[]
  sessionTypes: SessionType[]
  loading: boolean
  error: string | null
  refreshing: boolean
  fetchSessions: () => Promise<void>
  datesWithSessions: Set<string>
  filters: Array<{ key: string; label: string }>
}

export function useScheduleData({
  userId,
  fromDate,
  toDate,
}: UseScheduleDataParams): UseScheduleDataReturn {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Compute datesWithSessions from sessions array
  const datesWithSessions = useMemo(() => {
    const dates = new Set<string>()
    sessions.forEach((session) => {
      if (session.starts_at) {
        const dateKey = session.starts_at.split('T')[0]
        dates.add(dateKey)
      }
    })
    return dates
  }, [sessions])

  // Compute filters from session types
  const filters = useMemo(() => {
    const baseFilters = [{ key: 'all', label: 'All Sessions' }]
    const typeFilters = sessionTypes.map((t) => ({
      key: t.slug,
      label: t.name
    }))
    return [...baseFilters, ...typeFilters]
  }, [sessionTypes])

  // Fetch sessions function
  const fetchSessions = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      // Determine if this is a refresh or initial load
      const isRefresh = sessions.length > 0
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError(null)

      // Build query parameters
      const todayLocal = fromDate || getLocalDateString()
      const twoWeeksOut = new Date()
      twoWeeksOut.setDate(twoWeeksOut.getDate() + 14)
      const endDate = toDate || twoWeeksOut.toISOString().split('T')[0]

      const response = await fetch(
        `/api/sessions?from=${todayLocal}&to=${endDate}&status=scheduled`,
        { signal: abortControllerRef.current.signal }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      const data = await response.json()

      if (!isMountedRef.current) return

      setSessions(data.sessions || [])

      // Extract unique session types from sessions
      const typesMap = new Map<string, SessionType>()
      data.sessions?.forEach((session: SessionWithDetails) => {
        if (session.session_type) {
          typesMap.set(session.session_type.id, session.session_type)
        }
      })
      setSessionTypes(Array.from(typesMap.values()))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return
      }

      if (!isMountedRef.current) return

      console.error('Error fetching sessions:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [userId, fromDate, toDate, sessions.length])

  // Handle date range changes with debouncing
  useEffect(() => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // On initial mount, fetch immediately
    if (sessions.length === 0) {
      fetchSessions()
      return
    }

    // Otherwise, debounce for 300ms
    debounceTimerRef.current = setTimeout(() => {
      fetchSessions()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [fromDate, toDate, userId]) // Intentionally excluding fetchSessions to avoid infinite loop

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!userId) return

    autoRefreshIntervalRef.current = setInterval(() => {
      fetchSessions()
    }, 30000)

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [fetchSessions, userId])

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Clear timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [])

  return {
    sessions,
    sessionTypes,
    loading,
    error,
    refreshing,
    fetchSessions,
    datesWithSessions,
    filters,
  }
}
