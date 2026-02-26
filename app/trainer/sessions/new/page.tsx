'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import {
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle,
} from '@/components/ui/icons'
import type { SessionType } from '@/lib/types/sessions'
import { getLocalDateString, localInputsToUtc } from '@/lib/utils/date'

interface FormData {
  title: string
  session_type_id: string
  starts_at: string
  starts_time: string
  duration_minutes: number
}

export default function NewSessionPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTypes, setIsLoadingTypes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect non-trainers
  useEffect(() => {
    if (!authLoading && profile && !profile.is_trainer) {
      router.push('/schedule')
    }
  }, [profile, authLoading, router])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/member/login')
    }
  }, [user, authLoading, router])

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: 'Lesson',
    session_type_id: '',
    starts_at: getLocalDateString(),
    starts_time: '09:00',
    duration_minutes: 60,
  })

  // Fetch session types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const response = await fetch('/api/sessions?types_only=true')
        if (response.ok) {
          const data = await response.json()
          const types = data.session_types || []
          setSessionTypes(types)
          const lessonType = types.find((t: SessionType) => t.name.toLowerCase() === 'lesson')
          if (lessonType) {
            setFormData(prev => ({ ...prev, session_type_id: lessonType.id }))
          }
        }
      } catch (err) {
        console.error('Failed to fetch session types:', err)
      } finally {
        setIsLoadingTypes(false)
      }
    }
    fetchTypes()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Convert local date/time inputs to UTC for database
      const startsAtUtc = localInputsToUtc(formData.starts_at, formData.starts_time)
      const endsAtUtc = new Date(
        new Date(startsAtUtc).getTime() + formData.duration_minutes * 60000
      ).toISOString()

      const body = {
        title: formData.title,
        session_type_id: formData.session_type_id || null,
        starts_at: startsAtUtc,
        ends_at: endsAtUtc,
        duration_minutes: formData.duration_minutes,
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create session')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/trainer/sessions')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <GlassAppLayout title="Create Session" desktopTitle="Create Session" showBack showNotifications={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </GlassAppLayout>
    )
  }

  // Not authorized
  if (!profile?.is_trainer) {
    return null
  }

  if (success) {
    return (
      <GlassAppLayout title="Create Session" desktopTitle="Create Session" showBack showNotifications={false}>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Session Created!</h2>
          <p className="text-text-secondary">Redirecting to sessions...</p>
        </div>
      </GlassAppLayout>
    )
  }

  return (
    <GlassAppLayout title="Create Session" desktopTitle="Create Session" showBack showNotifications={false}>
      <GlassCard variant="subtle" className="p-8 lg:max-w-2xl lg:mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-2">
              Session Name *
            </label>
            <select
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-bg-input text-text-primary rounded-lg px-4 py-3 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="Lesson">Lesson</option>
            </select>
          </div>

          {/* Session Type */}
          <div>
            <label htmlFor="session_type_id" className="block text-sm font-medium text-text-primary mb-2">
              Session Type
            </label>
            <select
              id="session_type_id"
              name="session_type_id"
              value={formData.session_type_id}
              onChange={handleChange}
              className="w-full bg-bg-input text-text-primary rounded-lg px-4 py-3 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              disabled={isLoadingTypes}
            >
              {sessionTypes
                .filter(t => t.name.toLowerCase() === 'lesson')
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))
              }
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="starts_at" className="block text-sm font-medium text-text-primary mb-2">
                Date *
              </label>
              <input
                type="date"
                id="starts_at"
                name="starts_at"
                value={formData.starts_at}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-bg-input text-text-primary rounded-lg px-4 py-3 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label htmlFor="starts_time" className="block text-sm font-medium text-text-primary mb-2">
                Time *
              </label>
              <input
                type="time"
                id="starts_time"
                name="starts_time"
                value={formData.starts_time}
                onChange={handleChange}
                required
                className="w-full bg-bg-input text-text-primary rounded-lg px-4 py-3 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-text-primary mb-2">
              <Clock size={14} className="inline mr-1" />
              Duration (min)
            </label>
            <input
              type="number"
              id="duration_minutes"
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              min={15}
              max={180}
              step={15}
              className="w-full bg-bg-input text-text-primary rounded-lg px-4 py-3 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formData.title}
            className="w-full py-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Session'
            )}
          </button>
        </form>
      </GlassCard>
    </GlassAppLayout>
  )
}
