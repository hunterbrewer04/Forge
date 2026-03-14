'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import {
  Plus,
  X,
  Users,
  CreditCard,
  AlertCircle,
  Loader2,
  Pencil,
} from '@/components/ui/icons'
import type { TierListItem } from '@/modules/admin/types'

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
      setError(err instanceof Error ? err.message : 'Failed to save tier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative glass border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">
            {tier ? 'Edit Tier' : 'Create Tier'}
          </h3>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Tier Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium"
              required
              className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Monthly Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49.99"
              required
              min="0.01"
              step="0.01"
              className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Monthly Booking Quota
            </label>
            <input
              type="number"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              placeholder="8"
              required
              min="1"
              step="1"
              className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-bg-secondary text-text-secondary rounded-xl font-semibold text-sm transition-all hover:bg-bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !price || !quota}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Saving...' : tier ? 'Update Tier' : 'Create Tier'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<TierListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTier, setEditingTier] = useState<TierListItem | null>(null)
  const [archivingTier, setArchivingTier] = useState<TierListItem | null>(null)
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

  const handleArchive = async () => {
    if (!archivingTier) return
    try {
      const res = await fetch(`/api/admin/tiers/${archivingTier.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to archive tier')
      }
      toast.success('Tier archived')
      fetchTiers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive tier')
    } finally {
      setArchivingTier(null)
    }
  }

  const handleToggleVisibility = async (tier: TierListItem) => {
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
    }
  }

  const activeTiers = tiers.filter(t => t.is_active)
  const inactiveTiers = tiers.filter(t => !t.is_active)

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
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-bg-secondary p-4 rounded-full mb-3">
            <CreditCard size={32} className="text-text-muted" />
          </div>
          <h3 className="text-text-primary font-medium mb-1">No Tiers Yet</h3>
          <p className="text-text-secondary text-sm">Create your first membership tier to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Tiers */}
          {activeTiers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Active Tiers ({activeTiers.length})
              </h3>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {activeTiers.map((tier) => (
                  <motion.div key={tier.id} variants={fadeUpItem}>
                    <GlassCard variant="subtle" className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-text-primary">{tier.name}</h4>
                          <p className="text-2xl font-bold text-primary mt-1">
                            ${parseFloat(tier.price_monthly).toFixed(2)}
                            <span className="text-sm font-normal text-text-muted">/mo</span>
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                          Active
                        </span>
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
                          onClick={() => setArchivingTier(tier)}
                          className="flex-1 py-2 px-3 bg-bg-secondary rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          Archive
                        </button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Inactive Tiers */}
          {inactiveTiers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Archived Tiers ({inactiveTiers.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactiveTiers.map((tier) => (
                  <GlassCard key={tier.id} variant="subtle" className="p-5 opacity-60">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-text-primary">{tier.name}</h4>
                        <p className="text-xl font-bold text-text-secondary mt-1">
                          ${parseFloat(tier.price_monthly).toFixed(2)}
                          <span className="text-sm font-normal text-text-muted">/mo</span>
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-bg-secondary text-text-muted border border-border">
                        Archived
                      </span>
                    </div>
                    <p className="text-text-muted text-xs">
                      {tier.monthly_booking_quota} bookings/mo &middot; {tier.subscriber_count} subscribers
                    </p>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
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

      {/* Archive Confirmation */}
      {archivingTier && (
        <ConfirmModal
          title="Archive Tier"
          message={
            archivingTier.subscriber_count > 0
              ? `"${archivingTier.name}" has ${archivingTier.subscriber_count} active subscriber(s). You cannot archive a tier with active subscribers.`
              : `Are you sure you want to archive "${archivingTier.name}"? This will hide it from the paywall and archive the Stripe price.`
          }
          confirmText={archivingTier.subscriber_count > 0 ? 'OK' : 'Archive'}
          onConfirm={archivingTier.subscriber_count > 0 ? () => setArchivingTier(null) : handleArchive}
          onCancel={() => setArchivingTier(null)}
        />
      )}
    </GlassAppLayout>
  )
}
