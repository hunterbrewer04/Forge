'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import ConfirmModal from '@/components/ui/ConfirmModal'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import FormModal from '@/components/admin/FormModal'
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
  Filter,
  BadgeCheck,
} from '@/components/ui/icons'
import type { UserListItem, UserDetail, FilterRole } from '@/modules/admin/types'
import { INVITE_ROLES, FILTER_ROLES } from '@/modules/admin/types'

type RoleFilter = 'all' | FilterRole

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All Users' },
  { value: 'trainer', label: 'Trainers' },
  { value: 'admin', label: 'Admins' },
  { value: 'member', label: 'Members' },
  { value: 'full_access', label: 'Full Access' },
]

const PAGE_SIZE = 20

function RoleBadge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null
  const colors: Record<string, string> = {
    Admin: 'bg-red-500/10 text-red-500 border-red-500/20',
    Trainer: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Member: 'bg-green-500/10 text-green-500 border-green-500/20',
    'Full Access': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[label] || 'bg-bg-secondary text-text-secondary border-border'}`}>
      {label}
    </span>
  )
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
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
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
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
          className="w-full bg-bg-secondary text-text-primary rounded-xl px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none placeholder:text-text-muted"
        />
      </div>

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
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchDebounce, setSearchDebounce] = useState('')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const abortRef = useRef<AbortController | null>(null)

  const fetchUsers = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchDebounce) params.set('search', searchDebounce)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      const offset = (page - 1) * PAGE_SIZE
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))

      const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal })
      if (!res.ok) throw new Error('Failed to load users')
      const json = await res.json()
      setUsers(json.data)
      setTotal(json.total)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setUsers([])
      setTotal(0)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [searchDebounce, roleFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUserClick = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) throw new Error('Failed to load user')
      const json = await res.json()
      setSelectedUser(json.data)
    } catch {
      toast.error('Failed to load user details')
    }
  }

  const handleRoleChange = async (roles: Record<string, boolean>) => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roles),
      })
      if (!res.ok) throw new Error('Failed to update roles')
      // Refresh detail and list in parallel
      const [detailRes] = await Promise.all([
        fetch(`/api/admin/users/${selectedUser.id}`),
        fetchUsers(),
      ])
      if (detailRes.ok) {
        const json = await detailRes.json()
        setSelectedUser(json.data)
      }
    } catch {
      toast.error('Failed to update user roles')
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to deactivate')
      setSelectedUser(null)
      fetchUsers()
      toast.success('User deactivated')
    } catch {
      toast.error('Failed to deactivate user')
    }
  }

  const handleInvite = async (email: string, role?: string) => {
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailAddress: email, role }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || 'Failed to send invitation')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
            onChange={(e) => {
              setRoleFilter(e.target.value as RoleFilter)
              setPage(1)
            }}
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
        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchDebounce || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
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
                  <RoleBadge label="Member" active={user.is_member} />
                  <RoleBadge label="Full Access" active={user.has_full_access} />
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="size-9 flex items-center justify-center rounded-lg bg-bg-secondary border border-border text-text-secondary hover:text-text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
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
