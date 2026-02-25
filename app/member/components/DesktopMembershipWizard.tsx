'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Elements } from '@stripe/react-stripe-js'
import { getStripeAppearance } from '@/lib/stripe-appearance'
import { stripePromise } from '@/lib/stripe-client'
import type { MembershipTier } from '@/lib/types/database'
import GlassCard from '@/components/ui/GlassCard'
import DesktopWizardProgressSidebar from './DesktopWizardProgressSidebar'
import WizardStepAccount from './WizardStepAccount'
import WizardStepPlans from './WizardStepPlans'
import WizardStepSuccess from './WizardStepSuccess'
import PaymentForm from './PaymentForm'
import { type WizardStep, STEP_LABELS, stepIndex, STEP_HEADINGS } from './wizard-constants'

const desktopSlideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.98,
  }),
}

interface DesktopMembershipWizardProps {
  step: WizardStep
  direction: number
  tiers: MembershipTier[]
  selectedTier: MembershipTier | null
  clientSecret: string | null
  subscribing: string | null
  error: string
  isDark: boolean
  onAccountComplete: () => void
  onSelectTier: (tier: MembershipTier) => void
  onPaymentBack: () => void
  onPaymentSuccess: () => void
}

export default function DesktopMembershipWizard({
  step,
  direction,
  tiers,
  selectedTier,
  clientSecret,
  subscribing,
  error,
  isDark,
  onAccountComplete,
  onSelectTier,
  onPaymentBack,
  onPaymentSuccess,
}: DesktopMembershipWizardProps) {
  const stripeAppearance = useMemo(() => getStripeAppearance(isDark), [isDark])

  // Success step: separate centered GlassCard, no sidebar
  if (step === 'success') {
    return (
      <GlassCard className="max-w-2xl mx-auto p-12">
        <WizardStepSuccess />
      </GlassCard>
    )
  }

  const heading = STEP_HEADINGS[step]

  return (
    <GlassCard className="grid grid-cols-4 min-h-[600px] overflow-hidden">
      {/* Left sidebar — facility-primary gradient + progress steps */}
      <div
        className="col-span-1 flex flex-col justify-center p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
        }}
      >
        <DesktopWizardProgressSidebar
          steps={STEP_LABELS}
          currentStep={stepIndex(step)}
        />
      </div>

      {/* Right content area */}
      <div className="col-span-3 p-10 flex flex-col">
        {/* Step heading */}
        {heading.title && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary font-[--font-lexend]">
              {heading.title}
            </h1>
            {heading.description && (
              <p className="mt-2 text-text-secondary text-sm">{heading.description}</p>
            )}
          </div>
        )}

        {/* Step content with AnimatePresence */}
        <div className="flex-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={desktopSlideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {step === 'account' && (
                <WizardStepAccount onComplete={onAccountComplete} />
              )}

              {step === 'plans' && (
                <WizardStepPlans
                  tiers={tiers}
                  subscribing={subscribing}
                  error={error}
                  onSelectTier={onSelectTier}
                />
              )}

              {step === 'payment' && clientSecret && selectedTier && (
                <motion.div
                  key={isDark ? 'dark' : 'light'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Elements
                    stripe={stripePromise}
                    options={{ clientSecret, appearance: stripeAppearance }}
                  >
                    <PaymentForm
                      tierName={selectedTier.name}
                      priceMonthly={selectedTier.price_monthly}
                      onBack={onPaymentBack}
                      onSuccess={onPaymentSuccess}
                    />
                  </Elements>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  )
}
