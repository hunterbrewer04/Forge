'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import MobileLayout from '@/components/layout/MobileLayout'
import {
  Clock,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  Pencil,
  Trash2,
  Copy,
  CheckSquare,
  X,
  AlertTriangle,
} from '@/components/ui/icons'
import type { SessionWithDetails, SessionType, Booking } from '@/lib/types/sessions'
import { utcToLocalInputs, localInputsToUtc } from '@/lib/utils/date'

type ViewMode = 'view' | 'edit'
type ModalType = 'cancel' | 'duplicate' | 'complete' | null

interface BookingWithClient extends Booking {
  client: {
    id: string
    full_name: string | null
    avatar_url?: string | null
  } | null
}

export default function EditSessionPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id as string

  const [session, setSession] = useState<SessionWithDetails | null>(null)
  const [bookings, setBookings] = useState<BookingWithClient[]>([])
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('view')
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [cancellationReason, setCancellationReason] = useState('')

  // Form state for editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type_id: '',
    location: '',
    starts_at: '',
    starts_time: '',
    duration_minutes: 60,
    capacity: 8,
    is_premium: false,
  })

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}?include_bookings=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }
      const data = await response.json()
      setSession(data.session)
      setBookings(data.bookings || [])

      // Populate form data
      const s = data.session
      // Use utility to convert UTC to local date/time for form inputs
      const { date: localDate, time: localTime } = utcToLocalInputs(s.starts_at)
      setFormData({
        title: s.title || '',
        description: s.description || '',
        session_type_id: s.session_type_id || '',
        location: s.location || '',
        starts_at: localDate,
        starts_time: localTime,
        duration_minutes: s.duration_minutes || 60,
        capacity: s.capacity || 8,
        is_premium: s.is_premium || false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

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
    fetchSession()
    fetchSessionTypes()
  }, [fetchSession, fetchSessionTypes])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? parseInt(value) || 0
          : value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Convert local date/time inputs to UTC for database
      const startsAtUtc = localInputsToUtc(formData.starts_at, formData.starts_time)
      const endsAtUtc = new Date(
        new Date(startsAtUtc).getTime() + formData.duration_minutes * 60000
      ).toISOString()

      const body = {
        title: formData.title,
        description: formData.description || null,
        session_type_id: formData.session_type_id || null,
        location: formData.location || null,
        starts_at: startsAtUtc,
        ends_at: endsAtUtc,
        duration_minutes: formData.duration_minutes,
        capacity: formData.capacity,
        is_premium: formData.is_premium,
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update session')
      }

      setSuccessMessage('Session updated successfully!')
      setViewMode('view')
      fetchSession()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellation_reason: cancellationReason || 'Cancelled by trainer',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel session')
      }

      setSuccessMessage('Session cancelled successfully!')
      setActiveModal(null)
      fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel session')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkComplete = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark session as complete')
      }

      setSuccessMessage('Session marked as complete!')
      setActiveModal(null)
      fetchSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark session as complete')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Create a new session with the same data but next week
      // First convert to UTC, then add 7 days
      const startsAtUtc = localInputsToUtc(formData.starts_at, formData.starts_time)
      const startDateTime = new Date(startsAtUtc)
      startDateTime.setDate(startDateTime.getDate() + 7) // Next week
      const endDateTime = new Date(startDateTime.getTime() + formData.duration_minutes * 60000)

      const body = {
        title: formData.title,
        description: formData.description || null,
        session_type_id: formData.session_type_id || null,
        location: formData.location || null,
        starts_at: startDateTime.toISOString(),
        ends_at: endDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        capacity: formData.capacity,
        is_premium: formData.is_premium,
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to duplicate session')
      }

      const data = await response.json()
      setActiveModal(null)
      router.push(`/admin/sessions/${data.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate session')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
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

  if (isLoading) {
    return (
      <MobileLayout title="Session Details" showBack showNotifications={false}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={32} className="text-primary animate-spin mb-4" />
          <p className="text-stone-400">Loading session...</p>
        </div>
      </MobileLayout>
    )
  }

  if (error && !session) {
    return (
      <MobileLayout title="Session Details" showBack showNotifications={false}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle size={32} className="text-red-500 mb-4" />
          <p className="text-stone-400">{error}</p>
          <button
            onClick={() => router.push('/admin/sessions')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Back to Sessions
          </button>
        </div>
      </MobileLayout>
    )
  }

  if (!session) return null

  return (
    <MobileLayout
      title={viewMode === 'edit' ? 'Edit Session' : 'Session Details'}
      showBack
      showNotifications={false}
      topBarRightContent={
        viewMode === 'view' && session.status === 'scheduled' ? (
          <button
            onClick={() => setViewMode('edit')}
            className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-800 text-stone-300 transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
          >
            <Pencil size={20} />
          </button>
        ) : undefined
      }
    >
      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-green-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Status Badge */}
      {session.status !== 'scheduled' && (
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 ${
            session.status === 'cancelled'
              ? 'bg-red-500/10 text-red-400'
              : 'bg-green-500/10 text-green-400'
          }`}
        >
          {session.status === 'cancelled' ? (
            <X size={16} />
          ) : (
            <CheckCircle size={16} />
          )}
          <span className="font-medium capitalize">{session.status}</span>
        </div>
      )}

      {viewMode === 'view' ? (
        <>
          {/* Session Details View */}
          <div className="bg-surface-dark rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">{session.title}</h2>
              {session.session_type && (
                <span
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full mt-2"
                  style={{
                    backgroundColor: `${session.session_type.color}20`,
                    color: session.session_type.color,
                  }}
                >
                  {session.session_type.name}
                </span>
              )}
            </div>

            {session.description && (
              <p className="text-stone-400 text-sm">{session.description}</p>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-stone-300">
                <Calendar size={18} className="text-primary" />
                <span>{formatDate(session.starts_at)}</span>
              </div>
              <div className="flex items-center gap-3 text-stone-300">
                <Clock size={18} className="text-primary" />
                <span>
                  {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                  <span className="text-stone-500 ml-2">
                    ({session.duration_minutes} min)
                  </span>
                </span>
              </div>
              {session.location && (
                <div className="flex items-center gap-3 text-stone-300">
                  <MapPin size={18} className="text-primary" />
                  <span>{session.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-stone-300">
                <Users size={18} className="text-primary" />
                <span>
                  {session.availability.booked_count} / {session.availability.capacity} booked
                </span>
              </div>
            </div>
          </div>

          {/* Bookings List */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-white mb-3">
              Bookings ({bookings.filter(b => b.status === 'confirmed').length})
            </h3>
            {bookings.length === 0 ? (
              <div className="bg-surface-dark rounded-xl p-5 text-center">
                <Users size={32} className="text-stone-600 mx-auto mb-2" />
                <p className="text-stone-400">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={`bg-surface-dark rounded-xl p-4 flex items-center gap-3 ${
                      booking.status === 'cancelled' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                      {booking.client?.avatar_url ? (
                        <img
                          src={booking.client.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {booking.client?.full_name || 'Unknown Client'}
                      </p>
                      <p className="text-xs text-stone-500">
                        Booked {new Date(booking.booked_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-green-500/20 text-green-400'
                          : booking.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400'
                          : booking.status === 'attended'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {session.status === 'scheduled' && (
            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-bold text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveModal('duplicate')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
                >
                  <Copy size={18} />
                  <span className="font-medium">Duplicate</span>
                </button>
                <button
                  onClick={() => setActiveModal('complete')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
                >
                  <CheckSquare size={18} />
                  <span className="font-medium">Complete</span>
                </button>
              </div>
              <button
                onClick={() => setActiveModal('cancel')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={18} />
                <span className="font-medium">Cancel Session</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Edit Form */
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Session Type
            </label>
            <select
              name="session_type_id"
              value={formData.session_type_id}
              onChange={handleChange}
              className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select a type</option>
              {sessionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="starts_at"
                value={formData.starts_at}
                onChange={handleChange}
                className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Time *
              </label>
              <input
                type="time"
                name="starts_time"
                value={formData.starts_time}
                onChange={handleChange}
                className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Duration and Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Duration (min)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                min={15}
                max={180}
                step={15}
                className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min={1}
                max={50}
                className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Premium Toggle */}
          <div className="flex items-center justify-between p-4 bg-stone-800 rounded-lg">
            <div>
              <p className="font-medium text-white">Premium Session</p>
              <p className="text-sm text-stone-400">Mark this as a premium session</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_premium"
                checked={formData.is_premium}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setViewMode('view')}
              className="flex-1 py-3 px-4 bg-stone-700 text-white font-bold rounded-lg hover:bg-stone-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.title}
              className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative w-full max-w-sm bg-surface-dark rounded-2xl p-6">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {activeModal === 'cancel' && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={28} className="text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Cancel Session?
                  </h3>
                  <p className="text-gray-400">
                    This will cancel the session and notify all booked clients.
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-stone-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    rows={2}
                    placeholder="Why are you cancelling?"
                    className="w-full bg-stone-800 text-white rounded-lg px-4 py-3 border border-stone-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-stone-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Keep Session
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      'Cancel Session'
                    )}
                  </button>
                </div>
              </>
            )}

            {activeModal === 'duplicate' && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <Copy size={28} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Duplicate Session?
                  </h3>
                  <p className="text-gray-400">
                    Create a copy of this session scheduled for next week.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDuplicate}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      'Duplicate'
                    )}
                  </button>
                </div>
              </>
            )}

            {activeModal === 'complete' && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckSquare size={28} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Mark as Complete?
                  </h3>
                  <p className="text-gray-400">
                    This will mark the session as completed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 px-4 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkComplete}
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      'Complete'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </MobileLayout>
  )
}
