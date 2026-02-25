'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { getErrorMessage } from '@/lib/utils/errors'
import { Input } from '@/components/ui/shadcn/input'
import { Label } from '@/components/ui/shadcn/label'
import { Button } from '@/components/ui/shadcn/button'

import { PASSWORD_REQUIREMENTS, validatePassword } from '@/lib/utils/password'

const stagger = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
  }),
}

export default function SignupForm() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('email') ?? ''

  const [email, setEmail] = useState(prefillEmail)
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Database trigger creates profile with has_full_access: false by default.
        // Members use /member/signup instead; this form is for direct trainer clients.
        window.location.href = '/home'
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSignup}>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <motion.div
          custom={0}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            name="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="h-12 text-base mt-1.5"
          />
        </motion.div>

        <motion.div
          custom={1}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <Label htmlFor="email">Email</Label>
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

        <motion.div
          custom={2}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowPasswordRequirements(true)}
            onBlur={() => setShowPasswordRequirements(false)}
            placeholder="Password"
            className={`h-12 text-base mt-1.5 ${
              password.length > 0
                ? passwordStatus.allMet
                  ? 'border-green-500 focus-visible:ring-green-500/50'
                  : 'border-amber-500 focus-visible:ring-amber-500/50'
                : ''
            }`}
          />
          {(showPasswordRequirements || password.length > 0) && (
            <div className="bg-bg-input rounded-lg p-3 mt-2">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Password requirements:
              </p>
              <ul className="space-y-1">
                {passwordStatus.requirements.map((req) => (
                  <li
                    key={req.label}
                    className={`text-xs flex items-center gap-2 ${
                      req.met ? 'text-green-600' : 'text-text-muted'
                    }`}
                  >
                    <span className="flex-shrink-0">
                      {req.met ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </span>
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div
          custom={3}
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className={`h-12 text-base mt-1.5 ${
              confirmPassword.length > 0
                ? passwordsMatch
                  ? 'border-green-500 focus-visible:ring-green-500/50'
                  : 'border-red-500 focus-visible:ring-red-500/50'
                : ''
            }`}
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-xs text-destructive">
              Passwords do not match
            </p>
          )}
        </motion.div>
      </div>

      <motion.div
        custom={4}
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={loading || !passwordStatus.allMet || !passwordsMatch}
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </Button>
      </motion.div>

      <motion.div
        custom={5}
        variants={stagger}
        initial="hidden"
        animate="show"
        className="text-center text-sm"
      >
        <span className="text-text-secondary">Already have an account? </span>
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80"
        >
          Sign in
        </Link>
      </motion.div>
    </form>
  )
}
