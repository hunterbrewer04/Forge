'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import type { MembershipTier } from '@/lib/types/database'

export default function MemberPlansPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const [tiers, setTiers] = useState<MembershipTier[]>([])
  const [loadingTiers, setLoadingTiers] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
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

  const handleSelect = async (tierId: string) => {
    setCheckingOut(tierId)
    setError('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to start checkout')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCheckingOut(null)
    }
  }

  if (loading || loadingTiers) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
      </div>
    )
  }

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
              onClick={() => handleSelect(tier.id)}
              disabled={checkingOut !== null}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{ backgroundColor: 'var(--facility-primary)' }}
            >
              {checkingOut === tier.id ? 'Redirecting\u2026' : `Get ${tier.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
