'use client'

import { useRef } from 'react'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import FormInput from '@/components/ui/FormInput'
import {
  Loader2,
  Upload,
  Save,
} from '@/components/ui/icons'
import { useAdminSettings } from '@/lib/hooks/admin/useAdminSettings'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}

export default function AdminSettingsPage() {
  const isDesktop = useIsDesktop()
  const {
    settings,
    isLoading,
    name,
    setName,
    primaryColor,
    setPrimaryColor,
    advanceNotice,
    setAdvanceNotice,
    cancellationWindow,
    setCancellationWindow,
    businessHours,
    updateHours,
    notifications,
    setNotifications,
    isDirty,
    save,
    uploadLogo,
    isSaving,
    isUploading,
  } = useAdminSettings(isDesktop)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadLogo(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (isLoading) {
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
          onClick={save}
          disabled={isSaving || !isDirty}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      }
    >
      <div className="space-y-8">
        {/* Branding */}
        <section>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Branding
          </h3>
          <GlassCard variant="subtle" className="p-5 space-y-5">
            {/* Facility Name */}
            <FormInput
              label="Facility Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

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
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-bg-secondary rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary border border-border transition-all disabled:opacity-50"
                >
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {isUploading ? 'Uploading...' : 'Upload Logo'}
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
              <FormInput
                label="Advance Notice (minutes)"
                type="number"
                value={advanceNotice}
                onChange={(e) => setAdvanceNotice(e.target.value)}
                placeholder="60"
                min="0"
                hint="Minimum time before a session can be booked"
              />
              <FormInput
                label="Cancellation Window (minutes)"
                type="number"
                value={cancellationWindow}
                onChange={(e) => setCancellationWindow(e.target.value)}
                placeholder="120"
                min="0"
                hint="Time before session when cancellation is no longer allowed"
              />
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
                    onChange={(checked) => setNotifications({ ...notifications, [key]: checked })}
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
