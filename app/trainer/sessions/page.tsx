'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MobileLayout from '@/components/layout/MobileLayout'
import {
  Plus,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
} from '@/components/ui/icons'
import type { SessionWithDetails, SessionType } from '@/lib/types/sessions'

type FilterType = 'all' | 'upcoming' | 'past' | 'cancelled'

export default function AdminSessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionWithDetails[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const now = new Date().toISOString()
      let url = '/api/sessions?trainer_id=me'

      if (filter === 'upcoming') {
        url += `&from=${now}`
      } else if (filter === 'past') {
        url += `&to=${now}`
      } else if (filter === 'cancelled') {
        url += `&status=cancelled`
      }

      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [filter, typeFilter])

  const fetchSessionTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions?types_only=true')
      if (response.ok) {
        const data = await response.json()
        setSessionTypes(data.session_types || [])
      }
    } catch (err) {
      console.error('Failed to fetch session types:', err)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchSessionTypes()
  }, [fetchSessions, fetchSessionTypes])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchSessions()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusBadge = (session: SessionWithDetails) => {
    if (session.status === 'cancelled') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
          Cancelled
        </span>
      )
    }
    if (session.status === 'completed') {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
          Completed
        </span>
      )
    }
    if (session.availability.is_full) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
          Full
        </span>
      )
    }
    return null
  }

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'all', label: 'All' },
  ]

  return (
    <MobileLayout
      title="Sessions"
      showBack
      showNotifications={false}
      topBarRightContent={
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
            disabled={isRefreshing}
          >
            <RefreshCw
              size={20}
              className={isRefreshing ? 'animate-spin' : ''}
            />
          </button>
          <button
            onClick={() => router.push('/trainer/settings')}
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
          >
            <Settings size={20} />
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="space-y-3">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === btn.key
                  ? 'bg-primary text-white'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        {sessionTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-stone-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 bg-stone-800 text-white rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Types</option>
              {sessionTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={32} className="text-primary animate-spin mb-4" />
          <p className="text-stone-400">Loading sessions...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle size={32} className="text-red-500 mb-4" />
          <p className="text-stone-400">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar size={48} className="text-stone-600 mb-4" />
          <p className="text-stone-400 text-center mb-2">No sessions found</p>
          <p className="text-stone-500 text-sm text-center mb-6">
            {filter === 'upcoming'
              ? 'Create your first session to get started'
              : 'No sessions match the current filter'}
          </p>
          {filter === 'upcoming' && (
            <button
              onClick={() => router.push('/trainer/sessions/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium"
            >
              <Plus size={20} />
              Create Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => router.push(`/trainer/sessions/${session.id}`)}
              className="w-full bg-surface-dark rounded-xl p-4 text-left hover:bg-stone-800/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white truncate">
                      {session.title}
                    </h3>
                    {getStatusBadge(session)}
                  </div>

                  {session.session_type && (
                    <span
                      className="inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2"
                      style={{
                        backgroundColor: `${session.session_type.color}20`,
                        color: session.session_type.color,
                      }}
                    >
                      {session.session_type.name}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-primary" />
                      <span>{formatDate(session.starts_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" />
                      <span>{formatTime(session.starts_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-primary" />
                      <span>
                        {session.availability.booked_count}/
                        {session.availability.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                <ChevronRight size={20} className="text-stone-500 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB - Create New Session */}
      <button
        onClick={() => router.push('/trainer/sessions/new')}
        className="fixed bottom-24 right-4 size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform lg:bottom-8"
        aria-label="Create new session"
      >
        <Plus size={28} />
      </button>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </MobileLayout>
  )
}
