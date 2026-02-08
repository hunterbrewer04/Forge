'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { getErrorMessage } from '@/lib/utils/errors'

// Password validation requirements
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

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const supabase = createClient()

  // Calculate password strength and requirements status
  const passwordStatus = useMemo(() => {
    const results = PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    }))
    const allMet = results.every((r) => r.met)
    const metCount = results.filter((r) => r.met).length
    return { requirements: results, allMet, metCount }
  }, [password])

  // Check if passwords match
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Database trigger will automatically create profile with is_client: true
        window.location.href = '/chat'
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1C1C] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          {/* Forge logo placeholder */}
          <div className="w-12 h-12 bg-[#ff6714] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6 bg-[#2a2a2a] border border-stone-700 rounded-2xl p-6" onSubmit={handleSignup}>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="full-name" className="sr-only">
                Full name
              </label>
              <input
                id="full-name"
                name="full-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="relative block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset ring-stone-700 placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#ff6714] sm:text-sm sm:leading-6"
                placeholder="Full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset ring-stone-700 placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#ff6714] sm:text-sm sm:leading-6"
                placeholder="Email address"
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => setShowPasswordRequirements(false)}
                className={`relative block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                  password.length > 0
                    ? passwordStatus.allMet
                      ? 'ring-green-500 focus:ring-green-600'
                      : 'ring-amber-500 focus:ring-amber-600'
                    : 'ring-stone-700 focus:ring-[#ff6714]'
                }`}
                placeholder="Password"
              />
              {/* Password requirements indicator */}
              {(showPasswordRequirements || password.length > 0) && (
                <div className="mt-2 p-3 bg-[#1C1C1C] rounded-lg">
                  <p className="text-xs font-medium text-stone-300 mb-2">
                    Password requirements:
                  </p>
                  <ul className="space-y-1">
                    {passwordStatus.requirements.map((req) => (
                      <li
                        key={req.label}
                        className={`text-xs flex items-center gap-2 ${
                          req.met ? 'text-green-600' : 'text-stone-500'
                        }`}
                      >
                        <span className="flex-shrink-0">
                          {req.met ? (
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <circle cx="10" cy="10" r="3" />
                            </svg>
                          )}
                        </span>
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`relative block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'ring-green-500 focus:ring-green-600'
                      : 'ring-red-500 focus:ring-red-600'
                    : 'ring-stone-700 focus:ring-[#ff6714]'
                }`}
                placeholder="Confirm password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !passwordStatus.allMet || !passwordsMatch}
              className="group relative flex w-full justify-center rounded-lg bg-[#ff6714] py-3 px-4 text-sm font-semibold text-white hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6714] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-stone-400">Already have an account? </span>
            <Link
              href="/login"
              className="font-medium text-[#ff6714] hover:text-orange-400"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
