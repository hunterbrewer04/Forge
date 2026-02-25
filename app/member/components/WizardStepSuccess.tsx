// app/member/components/WizardStepSuccess.tsx
// Final step of the membership wizard — shown after payment is confirmed.
// Animates a checkmark, then staggers in the heading, description, and CTAs.
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/shadcn/button'

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const, delay },
  }),
}

export default function WizardStepSuccess() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">

      {/* Animated checkmark — drawn via CSS keyframes in globals.css */}
      <div className="flex justify-center">
        <svg className="w-20 h-20" viewBox="0 0 56 56" fill="none">
          <circle
            cx="28"
            cy="28"
            r="26"
            stroke="currentColor"
            strokeWidth="2"
            className="text-green-500 animate-checkmark-circle"
          />
          <path
            d="M17 28l7 7 15-15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green-500 animate-checkmark"
          />
        </svg>
      </div>

      {/* Heading */}
      <motion.h2
        className="text-3xl font-bold text-text-primary font-[--font-display]"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.4}
      >
        You&apos;re all set!
      </motion.h2>

      {/* Description */}
      <motion.p
        className="text-text-secondary text-sm leading-relaxed mt-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.6}
      >
        Your membership is active. Browse the session calendar and book your
        first lesson below.
      </motion.p>

      {/* CTAs */}
      <motion.div
        className="w-full space-y-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.8}
      >
        {/* Primary CTA */}
        <Button asChild size="lg" className="w-full">
          <Link href="/schedule">Browse Sessions</Link>
        </Button>

        {/* Secondary CTA */}
        <p className="text-sm text-text-secondary">
          Manage your membership at any time from your{' '}
          <Link
            href="/member/portal"
            className="underline text-text-secondary hover:text-text-primary transition-colors"
          >
            member portal
          </Link>
          .
        </p>
      </motion.div>

    </div>
  )
}
