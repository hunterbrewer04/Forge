'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import {
  Loader2,
  Upload,
  Save,
  Settings2,
} from '@/components/ui/icons'
import type { FacilitySettings } from '@/modules/admin/types'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<FacilitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1973f0')
  const [advanceNotice, setAdvanceNotice] = useState('')
  const [cancellationWindow, setCancellationWindow] = useState('')
  const [businessHours, setBusinessHours] = useState<Record<string, { open: string; close: string }>>({})
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    email_on_booking: true,
    email_on_cancellation: true,
    push_on_booking: true,
    push_on_cancellation: true,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const json = await res.json()
      const data = json.data as FacilitySettings | null
      setSettings(data)
      if (data) {
        setName(data.name)
        setPrimaryColor(data.primary_color)
        setAdvanceNotice(data.booking_advance_notice?.toString() || '')
        setCancellationWindow(data.cancellation_window?.toString() || '')
        if (data.business_hours) setBusinessHours(data.business_hours)
        if (data.notification_preferences) setNotifications(data.notification_preferences)
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (name !== (settings?.name || '')) body.name = name
      if (primaryColor !== (settings?.primary_color || '#1973f0')) body.primary_color = primaryColor
      if (advanceNotice !== (settings?.booking_advance_notice?.toString() || '')) {
        body.booking_advance_notice = advanceNotice !== '' ? parseInt(advanceNotice, 10) : 0
      }
      if (cancellationWindow !== (settings?.cancellation_window?.toString() || '')) {
        body.cancellation_window = cancellationWindow !== '' ? parseInt(cancellationWindow, 10) : 0
      }
      if (JSON.stringify(businessHours) !== JSON.stringify(settings?.business_hours || {})) {
        body.business_hours = businessHours
      }
      if (JSON.stringify(notifications) !== JSON.stringify(settings?.notification_preferences || {})) {
        body.notification_preferences = notifications
      }

      if (Object.keys(body).length === 0) return

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      const json = await res.json()
      const data = json.data as FacilitySettings
      setSettings(data)
      // Re-sync form state with server response
      setName(data.name)
      setPrimaryColor(data.primary_color)
      setAdvanceNotice(data.booking_advance_notice?.toString() || '')
      setCancellationWindow(data.cancellation_window?.toString() || '')
      if (data.business_hours) setBusinessHours(data.business_hours)
      if (data.notification_preferences) setNotifications(data.notification_preferences)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to upload')
      }
      toast.success('Logo uploaded')
      fetchSettings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const updateHours = (day: string, field: 'open' | 'close', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  const isDirty =
    name !== (settings?.name || '') ||
    primaryColor !== (settings?.primary_color || '#1973f0') ||
    advanceNotice !== (settings?.booking_advance_notice?.toString() || '') ||
    cancellationWindow !== (settings?.cancellation_window?.toString() || '') ||
    JSON.stringify(businessHours) !== JSON.stringify(settings?.business_hours || {}) ||
    JSON.stringify(notifications) !== JSON.stringify(settings?.notification_preferences || {})

  if (loading) {
    return (
      <GlassAppLayout title="Settings" desktopTitle="Facility Settings">
        <LoadingSpinner />
      </GlassAppLayout>
    )
  }

  return (
    <GlassAppLayout
      title="Settings"
      desktopTitle="Facility Settings"
      desktopHeaderRight={
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      }
    >
      <div className="space-y-8 max-w-3xl">
        {/* Branding */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Branding
          </h3>
          <GlassCard variant="subtle" className="p-5 space-y-5">
            {/* Facility Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Facility Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {settings?.logo_url && (
                  <img
                    src={settings.logo_url}
                    alt="Facility logo"
                    className="h-16 w-auto object-contain rounded-lg bg-bg-secondary p-2"
                  />
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary border border-border transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Brand Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-10 rounded-lg border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$"
                  className="w-32 bg-bg-secondary text-text-primary rounded-xl px-4 py-2.5 text-sm font-mono border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
                <div
                  className="size-10 rounded-lg border border-border"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Operations */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Operations
          </h3>
          <GlassCard variant="subtle" className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Advance Notice (minutes)
                </label>
                <input
                  type="number"
                  value={advanceNotice}
                  onChange={(e) => setAdvanceNotice(e.target.value)}
                  placeholder="60"
                  min="0"
                  className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
                />
                <p className="text-text-muted text-xs mt-1">Minimum time before a session can be booked</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Cancellation Window (minutes)
                </label>
                <input
                  type="number"
                  value={cancellationWindow}
                  onChange={(e) => setCancellationWindow(e.target.value)}
                  placeholder="120"
                  min="0"
                  className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
                />
                <p className="text-text-muted text-xs mt-1">Time before session when cancellation is no longer allowed</p>
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-3">
                Business Hours
              </label>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[100px_1fr_auto_1fr] gap-3 items-center">
                    <span className="text-sm text-text-primary font-medium">{DAY_LABELS[day]}</span>
                    <input
                      type="time"
                      value={businessHours[day]?.open || '06:00'}
                      onChange={(e) => updateHours(day, 'open', e.target.value)}
                      className="bg-bg-secondary text-text-primary rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                    />
                    <span className="text-text-muted text-sm text-center">to</span>
                    <input
                      type="time"
                      value={businessHours[day]?.close || '20:00'}
                      onChange={(e) => updateHours(day, 'close', e.target.value)}
                      className="bg-bg-secondary text-text-primary rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Notifications */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Notifications
          </h3>
          <GlassCard variant="subtle" className="p-5">
            <div className="space-y-3">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-text-primary font-medium">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <ToggleSwitch
                    checked={value}
                    onChange={(checked) => setNotifications(prev => ({ ...prev, [key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      </div>
    </GlassAppLayout>
  )
}
