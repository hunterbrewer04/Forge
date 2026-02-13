'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { getErrorMessage } from '@/lib/utils/errors'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get return_to URL from query parameters (set by proxy.ts)
  // Validate it's a relative path to prevent open redirects
  const rawReturnTo = searchParams.get('return_to') || '/home'
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/home'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Register auth listener BEFORE signIn to avoid missing the SIGNED_IN event.
      // signInWithPassword may emit SIGNED_IN synchronously on completion.
      const cleanup = { subscription: null as { unsubscribe: () => void } | null, timeout: null as ReturnType<typeof setTimeout> | null }
      let signInSucceeded = false

      try {
        const authConfirmed = new Promise<void>((resolve) => {
          cleanup.timeout = setTimeout(() => {
            console.warn('Auth state confirmation timed out after 3s — proceeding with login')
            cleanup.subscription?.unsubscribe()
            resolve()
          }, 3000)

          const { data } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
              if (cleanup.timeout) clearTimeout(cleanup.timeout)
              cleanup.subscription?.unsubscribe()
              resolve()
            }
          })
          cleanup.subscription = data.subscription
        })

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        // Wait for auth state confirmation (cookies persisted)
        await authConfirmed
        signInSucceeded = true
      } finally {
        if (!signInSucceeded) {
          cleanup.subscription?.unsubscribe()
          if (cleanup.timeout) clearTimeout(cleanup.timeout)
        }
      }

      // Await SW cache clear before redirect to prevent serving stale login page
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready
          reg.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (err) {
          console.warn('Failed to clear SW cache:', err)
        }
      }

      window.location.href = returnTo
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1C1C] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#ff6714] rounded-xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Sign in to your account
          </h2>
        </div>

        <div className="bg-[#2a2a2a] border border-stone-700 rounded-2xl p-6">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full rounded-lg border-0 py-3 px-4 bg-[#1C1C1C] text-white ring-1 ring-inset ring-stone-700 placeholder:text-stone-500 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#ff6714] sm:text-sm sm:leading-6"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg bg-[#ff6714] py-3 px-4 text-sm font-semibold text-white hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6714] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-stone-400">Don't have an account? </span>
              <Link
                href="/signup"
                className="font-medium text-[#ff6714] hover:text-orange-400"
              >
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
