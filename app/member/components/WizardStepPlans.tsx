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

      {/* ── Plans grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier, index) => {
          const isSubscribing = subscribing === tier.id
          const features: string[] = [`${tier.monthly_booking_quota} sessions per month`]

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              transition={{
                delay: index * 0.1,
                duration: 0.4,
                ease: [0.25, 0.4, 0.25, 1],
              }}
            >
              <Card className="p-6 gap-0 relative overflow-hidden hover:border-primary/50 transition-colors">
                {/* ── Tier header ── */}
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {tier.name}
                  </h2>
                  <p className="text-text-secondary text-sm mt-0.5">
                    {tier.monthly_booking_quota} sessions per month
                  </p>
                </div>

                {/* ── Price ── */}
                <div className="mt-4">
                  <span className="text-3xl font-bold text-text-primary">
                    ${tier.price_monthly}
                  </span>
                  <span className="text-text-secondary text-base font-normal">/mo</span>
                </div>

                {/* ── Feature list ── */}
                <ul className="mt-4 space-y-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        size={15}
                        strokeWidth={2.5}
                        className="mt-0.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span className="text-sm text-text-secondary leading-snug">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* ── CTA ── */}
                <Button
                  className="w-full mt-4"
                  size="lg"
                  disabled={subscribing !== null}
                  onClick={() => onSelectTier(tier)}
                >
                  {isSubscribing ? 'Setting up...' : `Get ${tier.name}`}
                </Button>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
