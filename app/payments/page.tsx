'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { ArrowLeft, CreditCard, Clipboard, Lock, Dumbbell } from '@/components/ui/icons'
import Link from 'next/link'
import { fetchPaymentsSummary } from '@/lib/services/payments'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

export default function PaymentsPage() {
  const { user, profile, loading } = useAuth()
  const { theme } = useFacilityTheme()
  const router = useRouter()

  const { data: paymentsSummary, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: fetchPaymentsSummary,
    enabled: !!user,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const invoices = paymentsSummary?.invoices ?? []
  const paymentMethods = paymentsSummary?.paymentMethods ?? []
  const hasActiveSubscription = paymentsSummary?.hasActiveSubscription ?? false
  const currentPeriodEnd = paymentsSummary?.currentPeriodEnd ?? null

  const formatPeriodEnd = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  const getInvoiceStatusStyle = (status: string | null) => {
    if (status === 'paid') return 'text-success'
    if (status === 'open') return 'text-warning'
    return 'text-error'
  }

  const getInvoiceStatusLabel = (status: string | null) => {
    if (status === 'paid') return 'PAID'
    if (status === 'open') return 'PENDING'
    return 'FAILED'
  }

  const getCardBrandLabel = (brand: string) =>
    brand.charAt(0).toUpperCase() + brand.slice(1)

  // Custom header (mobile only — GlassAppLayout shows desktop header separately)
  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-semibold text-text-primary">Payments</h1>

        <div className="size-10" />
      </div>
    </header>
  )

  return (
    <GlassAppLayout customHeader={customHeader} desktopTitle="Payments">
      {/* Desktop: 2-column grid — Mobile: stacked */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Left column: Membership Status Card */}
        <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="p-6">
            <section
              className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #111418, #2a2a2a)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/70 text-sm font-medium">Membership</span>
                <CreditCard size={24} className="text-white/50" />
              </div>

              {loadingPayments ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-white/20 rounded w-48 mb-3" />
                  <div className="h-5 bg-white/20 rounded w-36" />
                </div>
              ) : hasActiveSubscription ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">Active Membership</h2>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-success/20 text-success border border-success/30">
                      ACTIVE
                    </span>
                  </div>
                  {currentPeriodEnd && (
                    <p className="text-white/70 text-sm">
                      Renews {formatPeriodEnd(currentPeriodEnd)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-3">No Active Membership</h2>
                  <Link
                    href="/member/plans"
                    className="inline-block bg-white text-gray-900 py-2.5 px-5 rounded-xl font-semibold hover:bg-white/90 transition-colors text-sm"
                  >
                    View Plans
                  </Link>
                </>
              )}
            </section>
          </GlassCard>
        </motion.div>

        {/* Right column: Payment Methods + Recent Activity */}
        <motion.div variants={fadeUpItem} className="space-y-6">
          {/* Saved Payment Methods */}
          <GlassCard variant="subtle" className="p-6">
            <section>
              <h3 className="text-text-primary font-semibold mb-3">Saved Payment Methods</h3>

              <div className="space-y-2">
                {loadingPayments ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-bg-card border border-border rounded-xl" />
                    ))}
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-8 text-text-muted bg-bg-card border border-border rounded-xl">
                    <CreditCard size={48} className="mb-2 opacity-50 mx-auto" />
                    <p className="text-sm">No payment methods on file</p>
                  </div>
                ) : (
                  paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
                    >
                      <div className="w-10 h-7 bg-bg-secondary rounded flex items-center justify-center">
                        <CreditCard size={18} className="text-text-muted" />
                      </div>
                      {method.card ? (
                        <div className="flex-1">
                          <p className="text-text-primary font-medium">
                            {getCardBrandLabel(method.card.brand)} ending in {method.card.last4}
                          </p>
                          <p className="text-text-muted text-xs">
                            Expires {method.card.exp_month}/{method.card.exp_year}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="text-text-primary font-medium capitalize">{method.type}</p>
                        </div>
                      )}

                      {/* Default indicator */}
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center ${
                          method.is_default ? 'border-primary bg-primary' : 'border-border'
                        }`}
                      >
                        {method.is_default && <div className="size-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard variant="subtle" className="p-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-text-primary font-semibold">Recent Activity</h3>
              </div>

              <div className="space-y-2">
                {loadingPayments ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-bg-card border border-border rounded-xl" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-text-muted bg-bg-card border border-border rounded-xl">
                    <Clipboard size={48} className="mb-2 opacity-50 mx-auto" />
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
                    >
                      <div className="bg-bg-secondary p-2.5 rounded-full">
                        <Dumbbell size={22} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium text-sm truncate">
                          {inv.description || 'Membership'}
                        </p>
                        <p className="text-text-muted text-xs">
                          {new Date(inv.created * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-primary font-semibold">
                          ${(inv.amount_paid / 100).toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-semibold ${getInvoiceStatusStyle(inv.status)}`}>
                          {getInvoiceStatusLabel(inv.status)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Security Footer */}
      <section className="mt-8 mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <Lock size={16} />
          <span className="text-xs">SECURE PAYMENTS POWERED BY STRIPE</span>
        </div>
        <p className="text-[10px] text-text-muted mt-2 uppercase tracking-wider">
          {theme.name}
        </p>
      </section>
    </GlassAppLayout>
  )
}
