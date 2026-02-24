// app/member/plans/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { useAuth } from '@/contexts/AuthContext'
import type { MembershipTier } from '@/lib/types/database'
import PaymentForm from '@/app/member/components/PaymentForm'

// Created once at module scope — never recreated on re-render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Themes the Payment Element to match the existing dark design system.
// colorPrimary matches --facility-primary (#1973f0).
const STRIPE_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#1973f0',
    colorBackground: '#1C1C1C',
    colorText: '#ffffff',
    colorTextSecondary: '#a8a29e',
    colorDanger: '#f87171',
    fontFamily: 'Manrope, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #44403c',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #1973f0',
      boxShadow: 'none',
    },
    '.Label': {
      color: '#a8a29e',
      fontSize: '13px',
    },
  },
}

type PageView = 'tiers' | 'payment'

export default function MemberPlansPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const [view, setView] = useState<PageView>('tiers')
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Already active — skip to schedule
  useEffect(() => {
    if (!loading && profile?.membership_status === 'active') {
      router.replace('/schedule')
    }
  }, [loading, profile, router])

  useEffect(() => {
    fetch('/api/membership-tiers')
      .then((r) => r.json())
      .then((data) => {
        if (data.tiers) setTiers(data.tiers)
      })
      .catch(() => setError('Failed to load plans.'))
      .finally(() => setLoadingTiers(false))
  }, [])

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
      setView('payment')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubscribing(null)
    }
  }

  const handleBack = () => {
    setView('tiers')
    setClientSecret(null)
    setSelectedTier(null)
  }

  if (loading || loadingTiers) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
      </div>
    )
  }

  // Payment view — render the embedded Stripe Payment Element
  if (view === 'payment' && clientSecret && selectedTier) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
            Payment details
          </h1>
          <p className="mt-2 text-stone-400 text-sm">
            Your membership starts immediately after payment.
          </p>
        </div>

        <div className="bg-[#2a2a2a] border border-stone-700 rounded-2xl p-6">
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
          >
            <PaymentForm
              tierName={selectedTier.name}
              priceMonthly={selectedTier.price_monthly}
              onBack={handleBack}
            />
          </Elements>
        </div>
      </div>
    )
  }

  // Tiers view — show plan cards
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
          Choose your plan
        </h1>
        <p className="mt-2 text-stone-400 text-sm">
          Pick a membership to unlock the full booking calendar.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-[#2a2a2a] border border-stone-700 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{tier.name}</h2>
                <p className="text-stone-400 text-sm mt-0.5">
                  {tier.monthly_booking_quota} sessions per month
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-white">
                  ${tier.price_monthly}
                </span>
                <span className="text-stone-400 text-sm">/mo</span>
              </div>
            </div>

            <button
              onClick={() => handleSelectTier(tier)}
              disabled={subscribing !== null}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: 'var(--facility-primary)' }}
            >
              {subscribing === tier.id ? 'Setting up…' : `Get ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
