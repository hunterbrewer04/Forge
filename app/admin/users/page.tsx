'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import StatusBadge from '@/components/ui/StatusBadge'
import FormModal from '@/components/admin/FormModal'
import FormInput from '@/components/ui/FormInput'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import {
  Search,
  User,
  Users,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  BadgeCheck,
} from '@/components/ui/icons'
import type { UserDetail } from '@/modules/admin/types'
import { INVITE_ROLES } from '@/modules/admin/types'
import { getErrorMessage } from '@/lib/utils/errors'
import { useAdminUsers, isRoleFilter, type RoleFilter } from '@/lib/hooks/admin/useAdminUsers'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'admin', label: 'Admins' },
  { value: 'member', label: 'Members' },
  { value: 'full_access', label: 'Full Access' },
]

const ROLE_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Admin: 'danger',
  Trainer: 'info',
  Member: 'success',
  'Full Access': 'warning',
}

function RoleBadge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null
  return <StatusBadge label={label} variant={ROLE_VARIANTS[label] ?? 'neutral'} />
}

function UserDetailPanel({
  user,
  onClose,
  onRoleChange,
  onDeactivate,
}: {
  user: UserDetail
  onClose: () => void
  onRoleChange: (roles: Record<string, boolean>) => void
  onDeactivate: () => void
}) {
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [trainers, setTrainers] = useState<{ id: string; full_name: string | null }[]>([])
  const [assignedTrainerId, setAssignedTrainerId] = useState<string | null>(null)
  const [loadingTrainers, setLoadingTrainers] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    async function loadTrainers() {
      try {
        const [trainersRes, assignmentRes] = await Promise.all([
          fetch('/api/admin/users?role=trainer&limit=50'),
          fetch(`/api/admin/trainer-clients?clientId=${user.id}`),
        ])
        if (trainersRes.ok) {
          const data = await trainersRes.json()
          setTrainers(data.data.map((t: { id: string; full_name: string | null }) => ({ id: t.id, full_name: t.full_name })))
        }
        if (assignmentRes.ok) {
          const data = await assignmentRes.json()
          setAssignedTrainerId(data.data?.trainer_id ?? null)
        }
      } finally {
        setLoadingTrainers(false)
      }
    }
    if (user.is_member || user.has_full_access) loadTrainers()
    else setLoadingTrainers(false)
  }, [user.id, user.is_member, user.has_full_access])

  const handleAssignTrainer = async (trainerId: string | null) => {
    setAssigning(true)
    try {
      if (assignedTrainerId) {
        const delRes = await fetch('/api/admin/trainer-clients', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trainerId: assignedTrainerId, clientId: user.id }),
        })
        if (!delRes.ok) throw new Error('Failed to remove previous trainer')
      }
      if (trainerId) {
        const postRes = await fetch('/api/admin/trainer-clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trainerId, clientId: user.id }),
        })
        if (!postRes.ok) throw new Error('Failed to assign trainer')
      }
      setAssignedTrainerId(trainerId)
      toast.success(trainerId ? 'Trainer assigned' : 'Trainer removed')
    } catch {
      toast.error('Failed to update trainer assignment')
    } finally {
      setAssigning(false)
    }
  }

  const roles = [
    { key: 'isTrainer', label: 'Trainer', value: user.is_trainer },
    { key: 'isMember', label: 'Member', value: user.is_member },
    { key: 'hasFullAccess', label: 'Full Access', value: user.has_full_access },
    { key: 'isAdmin', label: 'Admin', value: user.is_admin },
  ]

  const handleToggle = async (key: string, current: boolean) => {
    setSaving(true)
    try {
      await onRoleChange({ [key]: !current })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed right-0 top-0 h-full w-full max-w-md z-40 bg-bg-primary border-l border-border shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">User Details</h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-bg-secondary overflow-hidden shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.full_name || 'User'}
                  width={64}
                  height={64}
                  className="object-cover size-full"
                />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <User size={28} className="text-text-muted" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-text-primary truncate">
                {user.full_name || 'Unnamed User'}
              </h3>
              <p className="text-text-secondary text-sm truncate">{user.email || 'No email'}</p>
            </div>
          </div>

          {/* Info Grid */}
          <GlassCard variant="subtle" className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Membership</span>
              <span className="text-text-primary font-medium">
                {user.membership_tier?.name || 'None'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <span className={`font-medium ${user.membership_status === 'active' ? 'text-green-500' : 'text-text-muted'}`}>
                {user.membership_status || 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Joined</span>
              <span className="text-text-primary font-medium">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            {user.stripe_customer_id && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Stripe</span>
                <span className="text-text-primary font-mono text-xs truncate max-w-[180px]">
                  {user.stripe_customer_id}
                </span>
              </div>
            )}
          </GlassCard>

          {/* Role Toggles */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">
              Roles & Access
            </h4>
            <div className="space-y-2">
              {roles.map(({ key, label, value }) => (
                <GlassCard key={key} variant="subtle" className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-text-primary font-medium">{label}</span>
                  <ToggleSwitch
                    checked={value}
                    onChange={() => handleToggle(key, value)}
                    disabled={saving}
                  />
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Assigned Trainer */}
          {(user.is_member || user.has_full_access) && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wider">
                Assigned Trainer
              </h4>
              <GlassCard variant="subtle" className="px-4 py-3">
                {loadingTrainers ? (
                  <div className="h-10 bg-bg-secondary rounded animate-pulse" />
                ) : (
                  <div className="relative">
                    <select
                      value={assignedTrainerId || ''}
                      onChange={(e) => handleAssignTrainer(e.target.value || null)}
                      disabled={assigning}
                      className="w-full bg-transparent text-text-primary text-sm font-medium appearance-none cursor-pointer disabled:opacity-50 outline-none pr-6"
                    >
                      <option value="">No trainer assigned</option>
                      {trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || 'Unnamed Trainer'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* Deactivate */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="w-full py-3 px-4 rounded-xl text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 font-semibold text-sm transition-all"
            >
              Deactivate User
            </button>
          </div>
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {showDeactivateConfirm && (
        <ConfirmModal
          title="Deactivate User"
          message={`This will remove all access for ${user.full_name || 'this user'}. They will no longer be able to log in or access any features.`}
          confirmText="Deactivate"
          onConfirm={() => {
            setShowDeactivateConfirm(false)
            onDeactivate()
          }}
          onCancel={() => setShowDeactivateConfirm(false)}
        />
      )}
    </>
  )
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void
  onInvite: (email: string, role?: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError(null)
    try {
      await onInvite(email.trim(), role || undefined)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send invitation'))
    } finally {
      setSending(false)
    }
  }

  return (
    <FormModal
      title="Invite User"
      submitLabel="Send Invite"
      onClose={onClose}
      onSubmit={handleSubmit}
      isSubmitting={sending}
      disabled={!email.trim()}
      error={error}
    >
      <FormInput
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
        required
      />

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Pre-assign Role (optional)
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="">No role (default)</option>
          {INVITE_ROLES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>
    </FormModal>
  )
}

export default function AdminUsersPage() {
  const isDesktop = useIsDesktop()
  const {
    users,
    total,
    totalPages,
    isLoading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    page,
    setPage,
    debouncedSearch,
    loadUserDetail,
    updateRoles,
    deactivate,
    invite,
  } = useAdminUsers(isDesktop)

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const handleUserClick = async (userId: string) => {
    const user = await loadUserDetail(userId)
    if (user) setSelectedUser(user)
  }

  const handleRoleChange = async (roles: Record<string, boolean>) => {
    if (!selectedUser) return
    const updated = await updateRoles(selectedUser.id, roles)
    if (updated) setSelectedUser(updated.data)
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return
    await deactivate(selectedUser.id)
    setSelectedUser(null)
  }

  const handleInvite = async (email: string, role?: string) => {
    await invite(email, role)
    toast.success('Invitation sent')
  }

  return (
    <GlassAppLayout
      title="Users"
      desktopTitle="User Management"
      desktopHeaderRight={
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Invite User</span>
        </button>
      }
    >
      {/* Filters Bar */}
      <div className="flex items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-secondary text-text-primary rounded-xl pl-9 pr-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <select
            value={roleFilter}
            onChange={(e) => { if (isRoleFilter(e.target.value)) setRoleFilter(e.target.value) }}
            className="bg-bg-secondary text-text-primary rounded-xl pl-9 pr-8 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        <span className="text-text-muted text-sm ml-auto">
          {total} {total === 1 ? 'user' : 'users'}
        </span>
      </div>

      {/* Users Table */}
      <GlassCard variant="subtle" className="overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
          <span>User</span>
          <span>Email</span>
          <span className="text-center w-40">Roles</span>
          <span className="text-center w-24">Membership</span>
          <span className="text-right w-24">Joined</span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={debouncedSearch || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
          />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show">
            {users.map((user) => (
              <motion.button
                key={user.id}
                variants={fadeUpItem}
                onClick={() => handleUserClick(user.id)}
                className="w-full grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-bg-secondary/50 transition-colors text-left cursor-pointer"
              >
                {/* User */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-full bg-bg-secondary overflow-hidden shrink-0">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name || 'User'}
                        width={36}
                        height={36}
                        className="object-cover size-full"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <User size={16} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-text-primary text-sm truncate">
                    {user.full_name || 'Unnamed'}
                  </span>
                </div>

                {/* Email */}
                <span className="text-text-secondary text-sm truncate">
                  {user.email || '—'}
                </span>

                {/* Roles */}
                <div className="flex items-center gap-1 w-40 justify-center flex-wrap">
                  <RoleBadge label="Admin" active={user.is_admin} />
                  <RoleBadge label="Trainer" active={user.is_trainer} />
                  {user.has_full_access ? (
                    <RoleBadge label="Full Access" active />
                  ) : (
                    <RoleBadge label="Member" active={user.is_member} />
                  )}
                  {!user.is_admin && !user.is_trainer && !user.is_member && !user.has_full_access && (
                    <span className="text-text-muted text-xs">None</span>
                  )}
                </div>

                {/* Membership */}
                <div className="w-24 text-center">
                  {user.membership_tier ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-text-primary">
                      <BadgeCheck size={12} className="text-primary" />
                      {user.membership_tier.name}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </div>

                {/* Joined */}
                <span className="text-text-secondary text-xs text-right w-24">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </GlassCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-text-muted text-sm">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="size-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="size-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Slide-out */}
      <AnimatePresence>
        {selectedUser && (
          <UserDetailPanel
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onRoleChange={handleRoleChange}
            onDeactivate={handleDeactivate}
          />
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <InviteModal
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInvite}
          />
        )}
      </AnimatePresence>
    </GlassAppLayout>
  )
}
