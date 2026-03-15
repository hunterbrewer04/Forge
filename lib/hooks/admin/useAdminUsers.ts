'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { UserListItem, UserDetail, FilterRole } from '@/modules/admin/types'

export type RoleFilter = 'all' | FilterRole

const ROLE_FILTER_VALUES = new Set<string>(['all', 'admin', 'trainer', 'member', 'full_access'])
export function isRoleFilter(value: string): value is RoleFilter {
  return ROLE_FILTER_VALUES.has(value)
}

const PAGE_SIZE = 20

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchUsers(params: {
  search: string
  roleFilter: RoleFilter
  page: number
}): Promise<{ data: UserListItem[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.roleFilter !== 'all') searchParams.set('role', params.roleFilter)
  const offset = (params.page - 1) * PAGE_SIZE
  searchParams.set('limit', String(PAGE_SIZE))
  searchParams.set('offset', String(offset))

  const res = await fetch(`/api/admin/users?${searchParams}`)
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

async function fetchUserDetail(userId: string): Promise<{ data: UserDetail }> {
  const res = await fetch(`/api/admin/users/${userId}`)
  if (!res.ok) throw new Error('Failed to load user')
  return res.json()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminUsers(enabled = true) {
  const queryClient = useQueryClient()

  // Filters + pagination
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search — reset page when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // ── User list query ──────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['admin-users', { page, search: debouncedSearch, roleFilter }],
    queryFn: () => fetchUsers({ search: debouncedSearch, roleFilter, page }),
    placeholderData: keepPreviousData,
    enabled,
  })

  const users: UserListItem[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Update roles mutation ────────────────────────────────────────────────
  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: Record<string, boolean> }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roles),
      })
      if (!res.ok) throw new Error('Failed to update roles')
      // Return refreshed detail
      return fetchUserDetail(userId)
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
    },
    onError: () => {
      toast.error('Failed to update user roles')
    },
  })

  // ── Deactivate mutation ──────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to deactivate')
    },
    onSuccess: () => {
      toast.success('User deactivated')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => {
      toast.error('Failed to deactivate user')
    },
  })

  // ── Invite mutation ──────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role?: string }) => {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress: email, role }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to send invitation')
      }
    },
  })

  // ── Load user detail (imperative — opens slide-out panel) ────────────────
  async function loadUserDetail(userId: string): Promise<UserDetail | null> {
    try {
      const result = await queryClient.fetchQuery({
        queryKey: ['admin-user-detail', userId],
        queryFn: () => fetchUserDetail(userId),
      })
      return result.data
    } catch {
      toast.error('Failed to load user details')
      return null
    }
  }

  return {
    // List state
    users,
    total,
    totalPages,
    isLoading,
    isFetching,

    // Filters
    search,
    setSearch,
    roleFilter,
    setRoleFilter: (filter: RoleFilter) => {
      setRoleFilter(filter)
      setPage(1)
    },
    page,
    setPage,
    debouncedSearch,
    pageSize: PAGE_SIZE,

    // Actions
    loadUserDetail,
    updateRoles: (userId: string, roles: Record<string, boolean>) =>
      updateRolesMutation.mutateAsync({ userId, roles }),
    deactivate: (userId: string) => deactivateMutation.mutateAsync(userId),
    invite: (email: string, role?: string) => inviteMutation.mutateAsync({ email, role }),

    // Mutation states
    isDeactivating: deactivateMutation.isPending,
  }
}
