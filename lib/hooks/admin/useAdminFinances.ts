'use client'

import { useMemo } from 'react'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import type { RevenueStats, InvoiceListItem } from '@/modules/admin/types'

const INVOICE_LIMIT = 20

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchRevenueStats(): Promise<{ data: RevenueStats }> {
  const res = await fetch('/api/admin/revenue')
  if (!res.ok) throw new Error('Failed to load stats')
  return res.json()
}

async function fetchInvoices(startingAfter?: string): Promise<{
  data: InvoiceListItem[]
  has_more: boolean
}> {
  const params = new URLSearchParams({ limit: String(INVOICE_LIMIT) })
  if (startingAfter) params.set('starting_after', startingAfter)
  const res = await fetch(`/api/admin/invoices?${params}`)
  if (!res.ok) throw new Error('Failed to load invoices')
  return res.json()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminFinances(enabled = true) {
  const queryClient = useQueryClient()

  // ── Revenue stats query ──────────────────────────────────────────────────
  const {
    data: statsData,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['admin-revenue-stats'],
    queryFn: fetchRevenueStats,
    staleTime: 60_000,
    enabled,
    retry: 1,
  })

  const stats: RevenueStats = statsData?.data ?? {
    mrr: 0,
    active_subscriptions: 0,
    total_members: 0,
    total_trainers: 0,
    new_this_month: 0,
  }

  // ── Invoices infinite query ────────────────────────────────────────────────
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-invoices'],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more || lastPage.data.length === 0) return undefined
      return lastPage.data[lastPage.data.length - 1].id
    },
    enabled,
  })

  // Flatten all pages into a single array
  const invoices = useMemo<InvoiceListItem[]>(
    () => invoicesData?.pages.flatMap((page) => page.data) ?? [],
    [invoicesData]
  )

  function loadMore() {
    if (hasNextPage) fetchNextPage()
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['admin-invoices'] })
    queryClient.invalidateQueries({ queryKey: ['admin-revenue-stats'] })
  }

  return {
    // Stats
    stats,
    isLoadingStats,

    // Invoices
    invoices,
    invoicesHasMore: !!hasNextPage,
    isLoadingInvoices,
    isLoadingMore: isFetchingNextPage,
    loadMore,
    refresh,
  }
}
