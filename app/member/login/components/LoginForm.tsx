'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useSignIn } from '@clerk/nextjs'
import { getClerkErrorMessage } from '@/lib/utils/errors'
import { clearDynamicCache } from '@/lib/utils/sw-cache'
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
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const { isLoaded, signIn, setActive } = useSignIn()
  const isDesktop = useIsDesktop()

  // Validate return_to is a relative path to prevent open redirects
  const rawReturnTo = searchParams.get('return_to') || '/home'
  const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/home'

  const verifying = signIn?.status === 'needs_second_factor'

  const completeSignIn = async (sessionId: string | null) => {
    if (!sessionId || !setActive) return
    await clearDynamicCache()
    await setActive({ session: sessionId })
    window.location.href = returnTo
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signIn) return
    setError('')
    setLoading(true)

    try {
      // Create sign-in attempt, then attempt password as first factor
      const created = await signIn.create({ identifier: email })

      let result = created
      if (created.status === 'needs_first_factor') {
        result = await signIn.attemptFirstFactor({ strategy: 'password', password })
      }

      if (result.status === 'complete') {
        await completeSignIn(result.createdSessionId)
      } else if (result.status === 'needs_second_factor') {
        const emailCodeFactor = result.supportedSecondFactors?.find(
          (factor) => factor.strategy === 'email_code',
        )
        if (emailCodeFactor) {
          await signIn.prepareSecondFactor({ strategy: 'email_code' })
        } else {
          setError('No supported verification method available. Please contact support.')
        }
        setLoading(false)
      } else {
        setError('Sign-in could not be completed. Please try again.')
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, 'Sign in failed. Please check your credentials.'))
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn) return
    setError('')
    setLoading(true)

    try {
      const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code })

      if (result.status === 'complete') {
        await completeSignIn(result.createdSessionId)
      } else {
        setError('Verification could not be completed. Please try again.')
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err, 'Invalid verification code. Please try again.'))
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError('')
    try {
      if (!signIn) return
      await signIn.prepareSecondFactor({ strategy: 'email_code' })
    } catch {
      setError('Failed to resend code. Please try again.')
    }
  }

  const handleBackToSignIn = async () => {
    setError('')
    setCode('')
    setLoading(false)
    // Re-navigate to clear the sign-in attempt
    window.location.reload()
  }

  const credentialsFields = (
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

  const verificationFields = (
    <>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <motion.div custom={0} variants={stagger} initial="hidden" animate="show">
        <p className="text-sm text-text-secondary">
          We sent a verification code to your email. Enter it below to continue.
        </p>
      </motion.div>

      <motion.div custom={1} variants={stagger} initial="hidden" animate="show">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter 6-digit code"
          className="h-12 text-base mt-1.5"
        />
      </motion.div>

      <motion.div custom={2} variants={stagger} initial="hidden" animate="show">
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify'}
        </Button>
      </motion.div>

      <motion.div
        custom={3}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-2 text-sm"
      >
        <button
          type="button"
          onClick={handleResendCode}
          className="font-medium text-primary hover:text-primary/80"
        >
          Resend code
        </button>
        <button
          type="button"
          onClick={handleBackToSignIn}
          className="text-text-secondary hover:text-text-primary"
        >
          Back to sign in
        </button>
      </motion.div>
    </>
  )

  const formFields = verifying ? verificationFields : credentialsFields
  const headingText = verifying ? 'Verify your identity' : 'Sign in to your account'
  const subtitleText = verifying
    ? 'One more step to secure your account.'
    : 'Welcome back. Enter your credentials below.'

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
              {headingText}
            </h1>
            <p className="mt-2 text-text-secondary text-sm">
              {subtitleText}
            </p>
          </div>

          <form className="space-y-6" onSubmit={verifying ? handleVerify : handleLogin}>
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
          {headingText}
        </h1>
        <p className="mt-2 text-text-secondary text-sm">
          {subtitleText}
        </p>
      </div>

      <form
        className="space-y-6 bg-bg-card border border-border rounded-2xl p-6"
        onSubmit={verifying ? handleVerify : handleLogin}
      >
        {formFields}
      </form>
    </div>
  )
}
