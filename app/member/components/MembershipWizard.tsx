// app/member/components/MembershipWizard.tsx
// Main orchestrator for the multi-step membership flow.
// Steps: account (if not logged in) → plans → payment → success
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { getStripeAppearance } from '@/lib/stripe-appearance'
import type { MembershipTier } from '@/lib/types/database'
import WizardProgressBar from './WizardProgressBar'
import WizardStepAccount from './WizardStepAccount'
import WizardStepPlans from './WizardStepPlans'
import WizardStepSuccess from './WizardStepSuccess'
import PaymentForm from './PaymentForm'

// Created once at module scope — never recreated on re-render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type WizardStep = 'account' | 'plans' | 'payment' | 'success'

const STEP_LABELS = ['Create Account', 'Choose Plan', 'Payment', 'Confirmation']
const STEP_ORDER: WizardStep[] = ['account', 'plans', 'payment', 'success']

function stepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step)
}

// Slide direction based on step transition
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
}

export default function MembershipWizard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { isDark } = useFacilityTheme()
  const router = useRouter()

  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const [step, setStep] = useState<WizardStep>('account')
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = back

  // Already active — skip to schedule
  useEffect(() => {
    if (!authLoading && profile?.membership_status === 'active') {
      router.replace('/schedule')
    }
  }, [authLoading, profile, router])

  // If user is logged in, skip account step
  useEffect(() => {
    if (!authLoading && user && step === 'account') {
      setStep('plans')
    }
  }, [authLoading, user, step])

  // Fetch tiers
  useEffect(() => {
    fetch('/api/membership-tiers')
      .then((r) => r.json())
      .then((data) => {
        if (data.tiers) setTiers(data.tiers)
      })
      .catch(() => setError('Failed to load plans.'))
      .finally(() => setLoadingTiers(false))
  }, [])

  const goTo = (next: WizardStep) => {
    setDirection(stepIndex(next) > stepIndex(step) ? 1 : -1)
    setStep(next)
  }

  const handleAccountComplete = () => {
    goTo('plans')
  }

  const handleSelectTier = async (tier: MembershipTier) => {
    setSubscribing(tier.id)
    setError('')

    try {
      const res = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: tier.id }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to set up payment')
      }

      setClientSecret(data.clientSecret)
      setSelectedTier(tier)
      goTo('payment')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubscribing(null)
    }
  }

  const handlePaymentBack = () => {
    setClientSecret(null)
    setSelectedTier(null)
    goTo('plans')
  }

  // Stripe appearance keyed to theme for remount on toggle
  const stripeAppearance = useMemo(() => getStripeAppearance(isDark), [isDark])

  // Headings per step
  const stepHeadings: Record<WizardStep, { title: string; description?: string }> = {
    account: { title: 'Create your account', description: 'Join to book sessions and manage your training.' },
    plans: { title: 'Choose your plan', description: 'Pick a membership to unlock the full booking calendar.' },
    payment: { title: 'Payment details', description: 'Your membership starts immediately after payment.' },
    success: { title: '', description: '' },
  }

  if (authLoading || loadingTiers) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const heading = stepHeadings[step]

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      {step !== 'success' && (
        <WizardProgressBar
          steps={STEP_LABELS}
          currentStep={stepIndex(step)}
        />
      )}

      {/* Step heading */}
      {heading.title && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary font-[--font-lexend]">
            {heading.title}
          </h1>
          {heading.description && (
            <p className="mt-2 text-text-secondary text-sm">{heading.description}</p>
          )}
        </div>
      )}

      {/* Step content with AnimatePresence */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        >
          {step === 'account' && (
            <WizardStepAccount onComplete={handleAccountComplete} />
          )}

          {step === 'plans' && (
            <WizardStepPlans
              tiers={tiers}
              subscribing={subscribing}
              error={error}
              onSelectTier={handleSelectTier}
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
                  onBack={handlePaymentBack}
                  onSuccess={() => goTo('success')}
                />
              </Elements>
            </motion.div>
          )}

          {step === 'success' && <WizardStepSuccess />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
