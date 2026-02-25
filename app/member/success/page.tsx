'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from '@/components/ui/icons'
import { useAuth } from '@/contexts/AuthContext'

export default function MemberSuccessPage() {
  const { profile, refreshProfile } = useAuth()
  const [activated, setActivated] = useState(
    profile?.membership_status === 'active'
  )

  useEffect(() => {
    if (activated) return

    let cancelled = false
    let attempt = 0
    const maxAttempts = 5
    const interval = 1500

    const poll = async () => {
      while (!cancelled && attempt < maxAttempts) {
        attempt++
        await refreshProfile()
        // refreshProfile updates profile in context; wait for next render
        await new Promise(resolve => setTimeout(resolve, interval))
      }
      // After max attempts, stop blocking regardless
      if (!cancelled) setActivated(true)
    }

    poll()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for profile update from polling
  useEffect(() => {
    if (profile?.membership_status === 'active') {
      setActivated(true)
    }
  }, [profile?.membership_status])

  if (!activated) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-stone-600 border-t-[var(--facility-primary)] animate-spin" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
            Activating your membership...
          </h1>
          <p className="mt-3 text-stone-400 text-sm leading-relaxed">
            This usually takes just a few seconds.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-center">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-500" />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
          You&apos;re all set!
        </h1>
        <p className="mt-3 text-stone-400 text-sm leading-relaxed">
          Your membership is active. Browse the session calendar and book
          your first lesson below.
        </p>
      </div>

      <Link
        href="/schedule"
        className="flex w-full justify-center rounded-xl py-3 px-4 text-sm font-semibold text-white"
        style={{ backgroundColor: 'var(--facility-primary)' }}
      >
        Browse Sessions
      </Link>

      <p className="text-stone-500 text-xs">
        Manage your membership at any time from your{' '}
        <Link href="/member/portal" className="underline text-stone-400">
          billing portal
        </Link>
        .
      </p>
    </div>
  )
}
