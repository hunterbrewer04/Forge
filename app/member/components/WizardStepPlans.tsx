// app/member/components/WizardStepPlans.tsx
// Pure presentational step for the membership wizard.
// Renders the plans grid only — no data fetching, no layout chrome.
'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { MembershipTier } from '@/lib/types/database'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'

interface WizardStepPlansProps {
  tiers: MembershipTier[]
  subscribing: string | null // tier ID currently being subscribed to, or null
  error: string
  onSelectTier: (tier: MembershipTier) => void
}

export default function WizardStepPlans({
  tiers,
  subscribing,
  error,
  onSelectTier,
}: WizardStepPlansProps) {
  return (
    <div>
      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* ── Plans ── */}
      <div className="flex flex-col gap-6">
        {tiers.map((tier, index) => {
          const isSubscribing = subscribing === tier.id

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              transition={{
                delay: index * 0.1,
                duration: 0.4,
                ease: [0.25, 0.4, 0.25, 1],
              }}
            >
              <Card className="p-6 gap-0 relative overflow-hidden hover:border-primary/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left: tier info */}
                  <div className="flex items-center gap-5">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {tier.name}
                      </h2>
                      <p className="text-text-secondary text-sm mt-0.5 flex items-center gap-2">
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        {tier.monthly_booking_quota} lessons per month
                      </p>
                    </div>
                  </div>

                  {/* Right: price + button */}
                  <div className="flex items-center gap-5 sm:flex-shrink-0">
                    <div className="text-right">
                      <span className="text-3xl font-bold text-text-primary">
                        ${tier.price_monthly}
                      </span>
                      <span className="text-text-secondary text-base font-normal">/mo</span>
                    </div>
                    <Button
                      size="lg"
                      disabled={subscribing !== null}
                      onClick={() => onSelectTier(tier)}
                      className="min-w-[130px]"
                    >
                      {isSubscribing ? 'Setting up...' : 'Subscribe'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
