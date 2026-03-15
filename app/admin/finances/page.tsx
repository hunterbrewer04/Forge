'use client'

import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StatusBadge from '@/components/ui/StatusBadge'
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
import { useAdminFinances } from '@/lib/hooks/admin/useAdminFinances'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { formatCurrency, centsToDollars } from '@/lib/utils/currency'
import type { RevenueStats } from '@/modules/admin/types'

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

function RevenueStatsGrid({ stats }: { stats: RevenueStats }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
    >
      <motion.div variants={fadeUpItem}>
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(stats.mrr)}
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
  )
}

export default function AdminFinancesPage() {
  const isDesktop = useIsDesktop()
  const {
    stats,
    isLoadingStats,
    invoices,
    invoicesHasMore,
    isLoadingInvoices,
    isLoadingMore,
    loadMore,
  } = useAdminFinances(isDesktop)

  return (
    <GlassAppLayout title="Finances" desktopTitle="Financial Overview">
      {/* Revenue Stats */}
      {isLoadingStats ? (
        <LoadingSpinner />
      ) : (
        <RevenueStatsGrid stats={stats} />
      )}

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

          {isLoadingInvoices ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No invoices found"
            />
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
                    {formatCurrency(centsToDollars(invoice.amount_paid))}
                  </span>

                  {/* Status */}
                  <div className="w-24 text-center">
                    <StatusBadge
                      label={invoice.status || 'unknown'}
                      variant={
                        invoice.status === 'paid' ? 'success'
                        : invoice.status === 'open' ? 'warning'
                        : 'neutral'
                      }
                    />
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
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="text-primary text-sm font-medium hover:underline disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                    {isLoadingMore ? 'Loading...' : 'Load more invoices'}
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
