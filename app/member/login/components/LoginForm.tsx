'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { getErrorMessage } from '@/lib/utils/errors'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import GlassCard from '@/components/ui/GlassCard'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Button } from '@/components/ui/shadcn/button'

const stagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' as const },
  }),
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isDesktop = useIsDesktop()

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
      // Use Promise.race with timeout because navigator.serviceWorker.ready
      // never rejects and waits indefinitely if no SW is active
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
          const reg = await Promise.race([navigator.serviceWorker.ready, timeout])
          if (reg) {
            reg.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
            await new Promise(resolve => setTimeout(resolve, 50))
          }
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

  const formFields = (
    <>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="h-12 text-base mt-1.5"
          />
        </motion.div>

        <motion.div custom={1} variants={stagger} initial="hidden" animate="show">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-12 text-base mt-1.5"
          />
        </motion.div>
      </div>

      <motion.div custom={2} variants={stagger} initial="hidden" animate="show">
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </motion.div>

      <motion.div
        custom={3}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center text-sm"
      >
        <span className="text-text-secondary">Don&apos;t have an account? </span>
        <Link href="/member/signup" className="font-medium text-primary hover:text-primary/80">
          Sign up
        </Link>
      </motion.div>
    </>
  )

  // Desktop: GlassCard with branding panel + form (matches signup wizard layout)
  if (isDesktop) {
    return (
      <GlassCard className="grid grid-cols-4 min-h-[560px] overflow-hidden max-w-4xl mx-auto">
        {/* Left branding panel */}
        <div
          className="col-span-1 flex flex-col justify-center items-center p-8 text-white relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
          }}
        >
          <Image
            src="/forge-logo.png"
            alt="Forge Sports Performance"
            width={640}
            height={320}
            className="max-h-[200px] w-auto mb-4"
            priority
          />
          <p className="text-white/70 text-sm text-center">
            Premium sports performance training
          </p>
        </div>

        {/* Right content panel */}
        <div className="col-span-3 p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary font-[--font-lexend]">
              Sign in to your account
            </h1>
            <p className="mt-2 text-text-secondary text-sm">
              Welcome back. Enter your credentials below.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {formFields}
          </form>
        </div>
      </GlassCard>
    )
  }

  // Mobile: heading + card (rendered inside MemberLayoutShell)
  return (
    <div className="space-y-8 w-full max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary font-[--font-lexend]">
          Sign in to your account
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          Welcome back. Enter your credentials below.
        </p>
      </div>

      <form
        className="space-y-6 bg-bg-card border border-border rounded-2xl p-6"
        onSubmit={handleLogin}
      >
        {formFields}
      </form>
    </div>
  )
}
