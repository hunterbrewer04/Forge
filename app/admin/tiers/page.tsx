'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import FormModal from '@/components/admin/FormModal'
import FormInput from '@/components/ui/FormInput'
import StatusBadge from '@/components/ui/StatusBadge'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import {
  Plus,
  Users,
  CreditCard,
  Pencil,
  Trash2,
} from '@/components/ui/icons'
import type { TierListItem } from '@/modules/admin/types'
import { getErrorMessage } from '@/lib/utils/errors'

function TierFormModal({
  tier,
  onClose,
  onSubmit,
}: {
  tier?: TierListItem
  onClose: () => void
  onSubmit: (data: { name: string; priceMonthly: number; monthlyBookingQuota: number }) => Promise<void>
}) {
  const [name, setName] = useState(tier?.name || '')
  const [price, setPrice] = useState(tier?.price_monthly || '')
  const [quota, setQuota] = useState(tier?.monthly_booking_quota?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price || !quota) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        priceMonthly: parseFloat(price),
        monthlyBookingQuota: parseInt(quota, 10),
      })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save tier'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      title={tier ? 'Edit Tier' : 'Create Tier'}
      submitLabel={tier ? 'Update Tier' : 'Create Tier'}
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      disabled={!name.trim() || !price || !quota}
      error={error}
    >
      <FormInput
        label="Tier Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Premium"
        required
      />

      <FormInput
        label="Monthly Price ($)"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="49.99"
        required
        min="0.01"
        step="0.01"
      />

      <FormInput
        label="Monthly Booking Quota"
        type="number"
        value={quota}
        onChange={(e) => setQuota(e.target.value)}
        placeholder="8"
        required
        min="1"
        step="1"
      />
    </FormModal>
  )
}

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<TierListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTier, setEditingTier] = useState<TierListItem | null>(null)
  const [deletingTier, setDeletingTier] = useState<TierListItem | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchTiers = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch('/api/admin/tiers', { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to load tiers')
      const json = await res.json()
      setTiers(json.data)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      toast.error('Failed to load tiers')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTiers()
  }, [fetchTiers])

  const handleCreate = async (data: { name: string; priceMonthly: number; monthlyBookingQuota: number }) => {
    const res = await fetch('/api/admin/tiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to create tier')
    }
    toast.success('Tier created')
    fetchTiers()
  }

  const handleUpdate = async (data: { name: string; priceMonthly: number; monthlyBookingQuota: number }) => {
    if (!editingTier) return
    const res = await fetch(`/api/admin/tiers/${editingTier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to update tier')
    }
    toast.success('Tier updated')
    setEditingTier(null)
    fetchTiers()
  }

  const handleDelete = async () => {
    if (!deletingTier) return
    try {
      const res = await fetch(`/api/admin/tiers/${deletingTier.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete tier')
      }
      toast.success('Tier deleted')
      fetchTiers()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete tier'))
    } finally {
      setDeletingTier(null)
    }
  }

  const handleToggleVisibility = async (tier: TierListItem) => {
    setTogglingId(tier.id)
    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tier.is_active }),
      })
      if (!res.ok) throw new Error('Failed to toggle visibility')
      fetchTiers()
    } catch {
      toast.error('Failed to toggle tier visibility')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <GlassAppLayout
      title="Tiers"
      desktopTitle="Membership Tiers"
      desktopHeaderRight={
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Create Tier</span>
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : tiers.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Tiers Yet"
          description="Create your first membership tier to get started."
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {tiers.map((tier) => (
            <motion.div key={tier.id} variants={fadeUpItem}>
              <GlassCard variant="subtle" className={`p-6 space-y-4 ${!tier.is_active ? 'opacity-60' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-text-primary">{tier.name}</h4>
                    <p className="text-2xl font-bold text-primary mt-1">
                      ${parseFloat(tier.price_monthly).toFixed(2)}
                      <span className="text-sm font-normal text-text-muted">/mo</span>
                    </p>
                  </div>
                  {tier.is_active ? (
                    <StatusBadge label="Active" variant="success" />
                  ) : (
                    <StatusBadge label="Hidden" variant="neutral" />
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-secondary rounded-lg px-3 py-2">
                    <p className="text-text-muted text-xs">Booking Quota</p>
                    <p className="text-text-primary font-semibold">{tier.monthly_booking_quota}/mo</p>
                  </div>
                  <div className="bg-bg-secondary rounded-lg px-3 py-2">
                    <p className="text-text-muted text-xs">Subscribers</p>
                    <p className="text-text-primary font-semibold flex items-center gap-1">
                      <Users size={14} className="text-text-muted" />
                      {tier.subscriber_count}
                    </p>
                  </div>
                </div>

                {/* Paywall Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary font-medium">Show on Paywall</span>
                  <ToggleSwitch
                    checked={tier.is_active}
                    onChange={() => handleToggleVisibility(tier)}
                    disabled={togglingId === tier.id}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingTier(tier)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-bg-secondary rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-all"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingTier(tier)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-bg-secondary rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <TierFormModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreate}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTier && (
          <TierFormModal
            tier={editingTier}
            onClose={() => setEditingTier(null)}
            onSubmit={handleUpdate}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      {deletingTier && (
        <ConfirmModal
          title="Delete Tier"
          message={
            deletingTier.subscriber_count > 0
              ? `"${deletingTier.name}" has ${deletingTier.subscriber_count} active subscriber(s). You cannot delete a tier with active subscribers.`
              : `Are you sure you want to delete "${deletingTier.name}"? This will permanently remove it and delete the associated Stripe product.`
          }
          confirmText={deletingTier.subscriber_count > 0 ? 'OK' : 'Delete'}
          onConfirm={deletingTier.subscriber_count > 0 ? () => setDeletingTier(null) : handleDelete}
          onCancel={() => setDeletingTier(null)}
        />
      )}
    </GlassAppLayout>
  )
}
