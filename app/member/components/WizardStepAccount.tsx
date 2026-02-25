// app/member/components/WizardStepAccount.tsx
// Account creation step for the multi-step membership wizard.
// Renders form fields only — no layout wrapper, logo, or heading.
// Parent wizard supplies those and calls onComplete() to advance.
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/utils/password'
import { getErrorMessage } from '@/lib/utils/errors'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Button } from '@/components/ui/shadcn/button'

interface WizardStepAccountProps {
  onComplete: () => void
}

const stagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' as const },
  }),
}

export default function WizardStepAccount({ onComplete }: WizardStepAccountProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const passwordStatus = useMemo(() => {
    const results = PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }))
    return { requirements: results, allMet: results.every((r) => r.met) }
  }, [password])

  const match = password === confirmPassword && confirmPassword.length > 0

  const passwordBorderClass =
    password.length > 0
      ? passwordStatus.allMet
        ? 'border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/30'
        : 'border-amber-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/30'
      : ''

  const confirmBorderClass =
    confirmPassword.length > 0
      ? match
        ? 'border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/30'
        : 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30'
      : ''

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePassword(password)
    if (validationError) {
      setError(validationError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })

      if (signUpError) throw signUpError

      if (data.user && data.session) {
        // Email confirmation disabled — active session, claim member flag immediately
        try {
          const claimRes = await fetch('/api/member/claim', { method: 'POST' })
          if (!claimRes.ok) {
            console.error('Member claim failed:', claimRes.status, await claimRes.text())
          }
        } catch (err) {
          console.error('Member claim request failed:', err)
        }
        onComplete()
      } else if (data.user) {
        // Email confirmation enabled — inform user
        setError('Check your email to confirm your account, then sign in to continue.')
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-5">
      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3"
        >
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Full name */}
      <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
        <Label htmlFor="wizard-full-name">Full name</Label>
        <Input
          id="wizard-full-name"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          className="h-12 text-base mt-1.5"
        />
      </motion.div>

      {/* Email */}
      <motion.div custom={1} variants={stagger} initial="hidden" animate="show">
        <Label htmlFor="wizard-email">Email address</Label>
        <Input
          id="wizard-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="h-12 text-base mt-1.5"
        />
      </motion.div>

      {/* Password */}
      <motion.div custom={2} variants={stagger} initial="hidden" animate="show">
        <Label htmlFor="wizard-password">Password</Label>
        <Input
          id="wizard-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setShowPasswordRequirements(true)}
          onBlur={() => setShowPasswordRequirements(false)}
          placeholder="Create a password"
          className={`h-12 text-base mt-1.5 ${passwordBorderClass}`}
        />

        {(showPasswordRequirements || password.length > 0) && (
          <ul className="bg-bg-input rounded-lg p-3 mt-2 space-y-1.5">
            {passwordStatus.requirements.map((req) => (
              <li
                key={req.label}
                className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                  req.met ? 'text-green-500' : 'text-muted-foreground'
                }`}
              >
                {req.met ? (
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <Circle size={13} strokeWidth={2} aria-hidden="true" />
                )}
                {req.label}
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Confirm password */}
      <motion.div custom={3} variants={stagger} initial="hidden" animate="show">
        <Label htmlFor="wizard-confirm-password">Confirm password</Label>
        <Input
          id="wizard-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          className={`h-12 text-base mt-1.5 ${confirmBorderClass}`}
        />
        {confirmPassword.length > 0 && !match && (
          <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
        )}
      </motion.div>

      {/* Submit */}
      <motion.div custom={4} variants={stagger} initial="hidden" animate="show">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !passwordStatus.allMet || !match}
        >
          {loading ? 'Creating account\u2026' : 'Continue'}
        </Button>
      </motion.div>

      {/* Sign-in link */}
      <motion.p
        custom={5}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center text-sm text-muted-foreground"
      >
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
          Sign in
        </Link>
      </motion.p>
    </form>
  )
}
