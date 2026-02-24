// app/member/signup/page.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { getErrorMessage } from '@/lib/utils/errors'

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
]

export default function MemberSignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
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

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!passwordStatus.allMet) {
      setError('Password does not meet requirements')
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
        window.location.href = '/member/plans'
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
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white font-[--font-lexend]">
          Create your account
        </h1>
        <p className="mt-2 text-stone-400 text-sm">
          Join to book sessions and manage your training.
        </p>
      </div>

      <form
        className="space-y-6 bg-[#2a2a2a] border border-stone-700 rounded-2xl p-6"
        onSubmit={handleSignup}
      >
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset ring-stone-700 placeholder:text-stone-500 focus:ring-2 focus:ring-inset focus:ring-[--facility-primary] sm:text-sm"
          />

          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset ring-stone-700 placeholder:text-stone-500 focus:ring-2 focus:ring-inset focus:ring-[--facility-primary] sm:text-sm"
          />

          <div>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordRequirements(true)}
              onBlur={() => setShowPasswordRequirements(false)}
              placeholder="Password"
              className={`block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset placeholder:text-stone-500 focus:ring-2 focus:ring-inset sm:text-sm ${
                password.length > 0
                  ? passwordStatus.allMet
                    ? 'ring-green-500 focus:ring-green-600'
                    : 'ring-amber-500 focus:ring-amber-600'
                  : 'ring-stone-700 focus:ring-[--facility-primary]'
              }`}
            />
            {(showPasswordRequirements || password.length > 0) && (
              <ul className="mt-2 p-3 bg-[#1C1C1C] rounded-lg space-y-1">
                {passwordStatus.requirements.map((req) => (
                  <li
                    key={req.label}
                    className={`text-xs flex items-center gap-2 ${req.met ? 'text-green-500' : 'text-stone-500'}`}
                  >
                    <span>{req.met ? '✓' : '·'}</span>
                    {req.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className={`block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset placeholder:text-stone-500 focus:ring-2 focus:ring-inset sm:text-sm ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? 'ring-green-500 focus:ring-green-600'
                    : 'ring-red-500 focus:ring-red-600'
                  : 'ring-stone-700 focus:ring-[--facility-primary]'
              }`}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !passwordStatus.allMet || !passwordsMatch}
          className="flex w-full justify-center rounded-lg py-3 px-4 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--facility-primary)' }}
        >
          {loading ? 'Creating account\u2026' : 'Create account'}
        </button>

        <p className="text-center text-sm text-stone-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--facility-primary)' }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
