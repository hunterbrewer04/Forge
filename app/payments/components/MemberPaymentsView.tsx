'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import GlassCard from '@/components/ui/GlassCard'
import FannedCardStack from './FannedCardStack'
import { CreditCard, Clipboard, Lock, Dumbbell } from '@/components/ui/icons'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/ui/StatusBadge'
import { fetchPaymentsSummary } from '@/lib/services/payments'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import type { DebitCardData } from './DebitCard'

function MembershipHeroCard({
  hasActiveSubscription,
  tierName,
  currentPeriodEnd,
  monthlyPrice,
  sessionsUsed,
  sessionsQuota,
  memberSince,
  isLoading,
}: {
  hasActiveSubscription: boolean
  tierName: string | null
  currentPeriodEnd: number | null
  monthlyPrice: number | null
  sessionsUsed?: number
  sessionsQuota?: number
  memberSince: string | null
  isLoading: boolean
}) {
  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <motion.div variants={fadeUpItem}>
      <div className="relative overflow-hidden rounded-2xl p-7 text-white" style={{ background: 'linear-gradient(135deg, #111418, #1e2330)' }}>
        {/* Orange glow */}
        <div className="absolute -top-[60px] -right-[60px] size-[200px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,146,58,0.15), transparent 70%)' }} />

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 bg-white/20 rounded" />
            <div className="h-8 w-48 bg-white/20 rounded" />
            <div className="h-5 w-36 bg-white/20 rounded" />
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs opacity-60 uppercase tracking-wider mb-2">Your Membership</div>
                <div className="font-display text-[26px] font-extrabold leading-none">
                  {hasActiveSubscription ? (tierName || 'Active Plan') : 'No Active Membership'}
                </div>
                {hasActiveSubscription && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                      Active
                    </span>
                    {currentPeriodEnd && (
                      <span className="text-xs opacity-50">Renews {formatDate(currentPeriodEnd)}</span>
                    )}
                  </div>
                )}
              </div>
              <CreditCard size={32} className="opacity-30" />
            </div>

            {hasActiveSubscription ? (
              <div className="flex gap-8 mt-6">
                {monthlyPrice !== null && (
                  <div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider">Monthly</div>
                    <div className="font-display text-2xl font-bold">
                      ${monthlyPrice}
                    </div>
                  </div>
                )}
                {sessionsQuota !== undefined && (
                  <div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider">Sessions Left</div>
                    <div className="font-display text-2xl font-bold">
                      {sessionsQuota - (sessionsUsed ?? 0)} / {sessionsQuota}
                    </div>
                  </div>
                )}
                {memberSince && (
                  <div>
                    <div className="text-[10px] opacity-50 uppercase tracking-wider">Member Since</div>
                    <div className="font-display text-2xl font-bold">
                      {new Date(memberSince).getFullYear()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <Link
                  href="/member/plans"
                  className="inline-block bg-white text-gray-900 py-2.5 px-5 rounded-xl font-semibold hover:bg-white/90 transition-colors text-sm"
                >
                  View Plans
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function MemberPaymentsView() {
  const { profile } = useAuth()
  const { theme } = useFacilityTheme()

  const { data: paymentsSummary, isLoading } = useQuery({
    queryKey: ['payments-summary'],
    queryFn: fetchPaymentsSummary,
    enabled: !!profile,
  })

  const invoices = paymentsSummary?.invoices ?? []
  const paymentMethods = paymentsSummary?.paymentMethods ?? []
  const hasActiveSubscription = paymentsSummary?.hasActiveSubscription ?? false
  const currentPeriodEnd = paymentsSummary?.currentPeriodEnd ?? null

  // Map Stripe payment methods to DebitCardData
  const cards: DebitCardData[] = paymentMethods
    .filter((pm) => pm.card)
    .map((pm) => ({
      id: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      exp_month: pm.card!.exp_month,
      exp_year: pm.card!.exp_year,
      cardholder: profile?.full_name || profile?.username || 'Card Holder',
      is_default: pm.is_default,
    }))

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      {/* Membership Hero Card */}
      {/* Note: tierName and monthlyPrice are not available from the current Stripe API responses.
          The hero card will display "Active Plan" as a fallback. To show the actual tier name and price,
          extend the /api/stripe/payment-methods response to include subscription plan details in a follow-up. */}
      <MembershipHeroCard
        hasActiveSubscription={hasActiveSubscription}
        tierName={invoices[0]?.description?.split(' — ')[0] ?? null}
        currentPeriodEnd={currentPeriodEnd}
        monthlyPrice={invoices[0] ? invoices[0].amount_paid / 100 : null}
        memberSince={profile?.created_at ?? null}
        isLoading={isLoading}
      />

      {/* Payment Methods — Fanned Card Stack */}
      <motion.div variants={fadeUpItem}>
        <GlassCard variant="subtle" className="p-5">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-5 w-24 bg-bg-secondary rounded mb-4" />
              <div className="h-[195px] w-[320px] bg-bg-secondary rounded-2xl mx-auto" />
            </div>
          ) : (
            <FannedCardStack cards={cards} />
          )}
        </GlassCard>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={fadeUpItem}>
        <GlassCard variant="subtle" className="p-5">
          <h3 className="text-sm font-bold text-text-primary mb-3">Recent Activity</h3>
          <div className="space-y-0">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-bg-secondary rounded-xl" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState icon={Clipboard} title="No transactions yet" />
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3.5 py-3.5 border-b border-border-light last:border-b-0"
                >
                  <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <span className="text-success text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {inv.description || 'Membership'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(inv.created * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-sm font-bold text-text-primary">
                      ${(inv.amount_paid / 100).toFixed(2)}
                    </p>
                    <StatusBadge
                      label={inv.status === 'paid' ? 'Paid' : inv.status === 'open' ? 'Pending' : 'Failed'}
                      variant={inv.status === 'paid' ? 'success' : inv.status === 'open' ? 'warning' : 'danger'}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Security Footer */}
      <section className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <Lock size={16} />
          <span className="text-xs">SECURE PAYMENTS POWERED BY STRIPE</span>
        </div>
        <p className="text-[10px] text-text-muted mt-2 uppercase tracking-wider">
          {theme.name}
        </p>
      </section>
    </motion.div>
  )
}
