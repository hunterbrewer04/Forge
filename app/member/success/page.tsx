'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import WizardStepSuccess from '@/app/member/components/WizardStepSuccess'

export default function MemberSuccessPage() {
  const { profile, refreshProfile } = useAuth()
  const [activated, setActivated] = useState(
    profile?.membership_status === 'active'
  )
  const activatedRef = useRef(activated)

  // Keep ref in sync so the poll loop can read the latest value
  useEffect(() => {
    activatedRef.current = activated
  }, [activated])

  // Watch for profile update from polling
  useEffect(() => {
    if (profile?.membership_status === 'active') {
      // Controlled one-way transition from external async event (Stripe → Supabase profile); not a cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivated(true)
    }
  }, [profile?.membership_status])

  // Poll for membership activation after payment
  useEffect(() => {
    if (activated) return

    let cancelled = false
    const maxAttempts = 5
    const interval = 1500

    const poll = async () => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (cancelled || activatedRef.current) return

        await refreshProfile()
        if (cancelled || activatedRef.current) return

        await new Promise(resolve => setTimeout(resolve, interval))
      }
      // After max attempts, stop blocking regardless
      if (!cancelled) setActivated(true)
    }

    poll()

    return () => { cancelled = true }
  }, [activated, refreshProfile])

  if (!activated) {
    return (
      <div className="flex flex-col items-center text-center gap-6 py-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary font-[--font-display]">
          Activating your membership...
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          This usually takes just a few seconds.
        </p>
      </div>
    )
  }

  return <WizardStepSuccess />
}
