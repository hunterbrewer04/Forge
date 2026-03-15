'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TierListItem, TierInput, TierUpdate } from '@/modules/admin/types'

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchTiers(): Promise<{ data: TierListItem[] }> {
  const res = await fetch('/api/admin/tiers')
  if (!res.ok) throw new Error('Failed to load tiers')
  return res.json()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminTiers(enabled = true) {
  const queryClient = useQueryClient()

  // ── Tiers query ──────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tiers'],
    queryFn: fetchTiers,
    staleTime: 60_000,
    enabled,
  })

  const tiers: TierListItem[] = data?.data ?? []

  // ── Create mutation ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (input: TierInput) => {
      const res = await fetch('/api/admin/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to create tier')
      }
    },
    onSuccess: () => {
      toast.success('Tier created')
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] })
    },
  })

  // ── Update mutation ──────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ tierId, update }: { tierId: string; update: TierUpdate }) => {
      const res = await fetch(`/api/admin/tiers/${tierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to update tier')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] })
    },
  })

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const res = await fetch(`/api/admin/tiers/${tierId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete tier')
      }
    },
    onSuccess: () => {
      toast.success('Tier deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-tiers'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete tier')
    },
  })

  // ── Toggle visibility (thin wrapper over update) ─────────────────────────
  async function toggleVisibility(tier: TierListItem) {
    try {
      await updateMutation.mutateAsync({ tierId: tier.id, update: { isActive: !tier.is_active } })
    } catch {
      toast.error('Failed to toggle tier visibility')
    }
  }

  return {
    tiers,
    isLoading,

    // Actions
    createTier: (input: TierInput) => createMutation.mutateAsync(input),
    updateTier: (tierId: string, update: TierUpdate) =>
      updateMutation.mutateAsync({ tierId, update }),
    deleteTier: (tierId: string) => deleteMutation.mutateAsync(tierId),
    toggleVisibility,

    // Mutation states
    isTogglingId: updateMutation.isPending ? updateMutation.variables?.tierId : null,
  }
}
