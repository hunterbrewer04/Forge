'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import {
  TrendingUp,
  Users,
  CreditCard,
  Plus,
  Loader2,
  ExternalLink,
  Download,
} from '@/components/ui/icons'
import type { RevenueStats, InvoiceListItem } from '@/modules/admin/types'

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ size: number; className?: string }>
  color: string
}) {
  return (
    <GlassCard variant="subtle" className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} className="text-current" />
        </div>
      </div>
    </GlassCard>
  )
}

export default function AdminFinancesPage() {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [invoicesHasMore, setInvoicesHasMore] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/revenue')
      if (!res.ok) throw new Error('Failed to load stats')
      const json = await res.json()
      setStats(json.data)
    } catch {
      toast.error('Failed to load revenue stats')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  const fetchInvoices = useCallback(async (startingAfter?: string) => {
    if (startingAfter) {
      setLoadingMore(true)
    } else {
      setLoadingInvoices(true)
    }

    try {
      const params = new URLSearchParams({ limit: '20' })
      if (startingAfter) params.set('starting_after', startingAfter)

      const res = await fetch(`/api/admin/invoices?${params}`)
      if (!res.ok) throw new Error('Failed to load invoices')
      const json = await res.json()

      if (startingAfter) {
        setInvoices(prev => [...prev, ...json.data])
      } else {
        setInvoices(json.data)
      }
      setInvoicesHasMore(json.has_more)
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoadingInvoices(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchInvoices()
  }, [fetchStats, fetchInvoices])

  return (
    <GlassAppLayout title="Finances" desktopTitle="Financial Overview">
      {/* Revenue Stats */}
      {loadingStats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-primary animate-spin" />
        </div>
      ) : stats ? (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={fadeUpItem}>
            <StatCard
              label="Monthly Revenue"
              value={`$${stats.mrr.toFixed(2)}`}
              icon={TrendingUp}
              color="bg-green-500/10 text-green-500"
            />
          </motion.div>
          <motion.div variants={fadeUpItem}>
            <StatCard
              label="Active Subscriptions"
              value={stats.active_subscriptions}
              icon={CreditCard}
              color="bg-primary/10 text-primary"
            />
          </motion.div>
          <motion.div variants={fadeUpItem}>
            <StatCard
              label="Total Members"
              value={stats.total_members}
              icon={Users}
              color="bg-blue-500/10 text-blue-500"
            />
          </motion.div>
          <motion.div variants={fadeUpItem}>
            <StatCard
              label="New This Month"
              value={stats.new_this_month}
              icon={Plus}
              color="bg-amber-500/10 text-amber-500"
            />
          </motion.div>
        </motion.div>
      ) : null}

      {/* Invoices */}
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Invoice History
        </h3>
        <GlassCard variant="subtle" className="overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wider">
            <span>Customer</span>
            <span>Amount</span>
            <span className="text-center w-24">Status</span>
            <span className="text-center w-28">Date</span>
            <span className="text-right w-16">Link</span>
          </div>

          {loadingInvoices ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-primary animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-bg-secondary p-3 rounded-full mb-3">
                <CreditCard size={24} className="text-text-muted" />
              </div>
              <p className="text-text-secondary text-sm">No invoices found</p>
            </div>
          ) : (
            <>
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 border-b border-border/50 last:border-b-0"
                >
                  {/* Customer */}
                  <span className="text-text-primary text-sm truncate">
                    {invoice.customer_email || '—'}
                  </span>

                  {/* Amount */}
                  <span className="text-text-primary text-sm font-medium">
                    ${(invoice.amount_paid / 100).toFixed(2)}
                  </span>

                  {/* Status */}
                  <div className="w-24 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                      invoice.status === 'paid'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : invoice.status === 'open'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-bg-secondary text-text-muted border-border'
                    }`}>
                      {invoice.status || 'unknown'}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-text-secondary text-xs w-28 text-center">
                    {new Date(invoice.created * 1000).toLocaleDateString()}
                  </span>

                  {/* Actions */}
                  <div className="w-16 flex justify-end gap-1">
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-all"
                        title="View invoice"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-all"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More */}
              {invoicesHasMore && (
                <div className="px-5 py-3 border-t border-border">
                  <button
                    onClick={() => {
                      const lastId = invoices[invoices.length - 1]?.id
                      if (lastId) fetchInvoices(lastId)
                    }}
                    disabled={loadingMore}
                    className="text-primary text-sm font-medium hover:underline disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingMore && <Loader2 size={14} className="animate-spin" />}
                    {loadingMore ? 'Loading...' : 'Load more invoices'}
                  </button>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </GlassAppLayout>
  )
}
