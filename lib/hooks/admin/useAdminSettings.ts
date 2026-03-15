'use client'

import { useState, useReducer, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FacilitySettings, SettingsUpdate } from '@/modules/admin/types'
import { getErrorMessage } from '@/lib/utils/errors'

const DEFAULT_COLOR = '#1973f0'

// ── Form state managed via a single reducer ───────────────────────────────────

interface FormState {
  name: string
  primaryColor: string
  advanceNotice: string
  cancellationWindow: string
  businessHours: Record<string, { open: string; close: string }>
  notifications: Record<string, boolean>
}

type FormAction =
  | { type: 'INIT'; payload: FacilitySettings }
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_PRIMARY_COLOR'; value: string }
  | { type: 'SET_ADVANCE_NOTICE'; value: string }
  | { type: 'SET_CANCELLATION_WINDOW'; value: string }
  | { type: 'UPDATE_HOURS'; day: string; field: 'open' | 'close'; value: string }
  | { type: 'SET_NOTIFICATIONS'; value: Record<string, boolean> }

const DEFAULT_FORM: FormState = {
  name: '',
  primaryColor: DEFAULT_COLOR,
  advanceNotice: '',
  cancellationWindow: '',
  businessHours: {},
  notifications: {
    email_on_booking: true,
    email_on_cancellation: true,
    push_on_booking: true,
    push_on_cancellation: true,
  },
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'INIT':
      return {
        name: action.payload.name ?? '',
        primaryColor: action.payload.primary_color ?? DEFAULT_COLOR,
        advanceNotice: action.payload.booking_advance_notice?.toString() ?? '',
        cancellationWindow: action.payload.cancellation_window?.toString() ?? '',
        businessHours: action.payload.business_hours ?? {},
        notifications: action.payload.notification_preferences ?? state.notifications,
      }
    case 'SET_NAME':
      return { ...state, name: action.value }
    case 'SET_PRIMARY_COLOR':
      return { ...state, primaryColor: action.value }
    case 'SET_ADVANCE_NOTICE':
      return { ...state, advanceNotice: action.value }
    case 'SET_CANCELLATION_WINDOW':
      return { ...state, cancellationWindow: action.value }
    case 'UPDATE_HOURS':
      return {
        ...state,
        businessHours: {
          ...state.businessHours,
          [action.day]: { ...state.businessHours[action.day], [action.field]: action.value },
        },
      }
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.value }
    default:
      return state
  }
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<{ data: FacilitySettings | null }> {
  const res = await fetch('/api/admin/settings')
  if (!res.ok) throw new Error('Failed to load settings')
  return res.json()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminSettings(enabled = true) {
  const queryClient = useQueryClient()
  const [form, dispatch] = useReducer(formReducer, DEFAULT_FORM)

  // ── Settings query ───────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
    staleTime: 60_000,
    enabled,
  })

  const settings: FacilitySettings | null = data?.data ?? null

  // Sync form when server data arrives — single dispatch, no cascading renders
  const [syncedId, setSyncedId] = useState<string | null>(null)
  useEffect(() => {
    if (settings && settings.id !== syncedId) {
      dispatch({ type: 'INIT', payload: settings })
      setSyncedId(settings.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.id])

  // ── Dirty check ──────────────────────────────────────────────────────────
  const isDirty = useMemo(() =>
    form.name !== (settings?.name ?? '') ||
    form.primaryColor !== (settings?.primary_color ?? DEFAULT_COLOR) ||
    form.advanceNotice !== (settings?.booking_advance_notice?.toString() ?? '') ||
    form.cancellationWindow !== (settings?.cancellation_window?.toString() ?? '') ||
    JSON.stringify(form.businessHours) !== JSON.stringify(settings?.business_hours ?? {}) ||
    JSON.stringify(form.notifications) !== JSON.stringify(settings?.notification_preferences ?? {}),
  [form, settings])

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: SettingsUpdate = {}

      if (form.name !== (settings?.name ?? '')) body.name = form.name
      if (form.primaryColor !== (settings?.primary_color ?? DEFAULT_COLOR)) {
        body.primary_color = form.primaryColor
      }
      if (form.advanceNotice !== (settings?.booking_advance_notice?.toString() ?? '')) {
        body.booking_advance_notice =
          form.advanceNotice !== '' ? parseInt(form.advanceNotice, 10) : 0
      }
      if (form.cancellationWindow !== (settings?.cancellation_window?.toString() ?? '')) {
        body.cancellation_window =
          form.cancellationWindow !== '' ? parseInt(form.cancellationWindow, 10) : 0
      }
      if (JSON.stringify(form.businessHours) !== JSON.stringify(settings?.business_hours ?? {})) {
        body.business_hours = form.businessHours
      }
      if (
        JSON.stringify(form.notifications) !==
        JSON.stringify(settings?.notification_preferences ?? {})
      ) {
        body.notification_preferences = form.notifications
      }

      if (Object.keys(body).length === 0) return null

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json() as Promise<{ data: FacilitySettings }>
    },
    onSuccess: (result) => {
      if (!result) return
      toast.success('Settings saved')
      queryClient.setQueryData(['admin-settings'], { data: result.data })
      // Re-sync the form with returned server state
      dispatch({ type: 'INIT', payload: result.data })
      setSyncedId(result.data.id)
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })

  // ── Logo upload mutation ─────────────────────────────────────────────────
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
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
    },
    onSuccess: () => {
      toast.success('Logo uploaded')
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to upload logo'))
    },
  })

  return {
    // Query state
    settings,
    isLoading,

    // Form state (spread for easy access in the page)
    name: form.name,
    setName: (value: string) => dispatch({ type: 'SET_NAME', value }),
    primaryColor: form.primaryColor,
    setPrimaryColor: (value: string) => dispatch({ type: 'SET_PRIMARY_COLOR', value }),
    advanceNotice: form.advanceNotice,
    setAdvanceNotice: (value: string) => dispatch({ type: 'SET_ADVANCE_NOTICE', value }),
    cancellationWindow: form.cancellationWindow,
    setCancellationWindow: (value: string) => dispatch({ type: 'SET_CANCELLATION_WINDOW', value }),
    businessHours: form.businessHours,
    updateHours: (day: string, field: 'open' | 'close', value: string) =>
      dispatch({ type: 'UPDATE_HOURS', day, field, value }),
    notifications: form.notifications,
    setNotifications: (value: Record<string, boolean>) =>
      dispatch({ type: 'SET_NOTIFICATIONS', value }),

    // Derived
    isDirty,

    // Actions
    save: () => saveMutation.mutateAsync(),
    uploadLogo: (file: File) => uploadLogoMutation.mutateAsync(file),

    // Mutation states
    isSaving: saveMutation.isPending,
    isUploading: uploadLogoMutation.isPending,
  }
}
