// app/member/components/WizardProgressBar.tsx
// Horizontal step progress indicator for the multi-step membership wizard.
'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface WizardProgressBarProps {
  steps: string[]
  currentStep: number // 0-indexed
}

export default function WizardProgressBar({ steps, currentStep }: WizardProgressBarProps) {
  return (
    <div className="w-full">
      {/* ── Desktop (md+): numbered circles + labels + connecting lines ── */}
      <div className="hidden md:flex items-start justify-between relative">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isFuture = index > currentStep

          return (
            <div key={label} className="flex flex-col items-center flex-1 relative">

              {/* Connecting line — sits behind circles, drawn between steps */}
              {index < steps.length - 1 && (
                <div
                  className="absolute top-5 left-1/2 w-full h-px"
                  aria-hidden="true"
                >
                  {/* Background track */}
                  <div className="absolute inset-0 bg-border" />
                  {/* Filled progress layer */}
                  <motion.div
                    className="absolute inset-0 origin-left bg-primary"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
                  />
                </div>
              )}

              {/* Step circle */}
              <div
                className={[
                  'relative z-10 flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-colors duration-300',
                  isCompleted || isCurrent
                    ? 'bg-primary text-white'
                    : 'bg-bg-secondary text-text-muted',
                ].join(' ')}
              >
                {isCompleted ? (
                  <motion.span
                    key={`check-${index}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  </motion.span>
                ) : (
                  <span>{index + 1}</span>
                )}

                {/* Pulse ring on the active step */}
                {isCurrent && (
                  <motion.div
                    layout
                    className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                    layoutId="active-ring"
                    transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                  />
                )}
              </div>

              {/* Step label */}
              <span
                className={[
                  'mt-2.5 text-xs text-center leading-tight transition-colors duration-300 px-1',
                  isCurrent
                    ? 'text-primary font-semibold'
                    : isFuture
                    ? 'text-text-muted font-medium'
                    : 'text-text-secondary font-medium',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Mobile (<md): numbered circles only + current step label below ── */}
      <div className="md:hidden">
        <div className="flex items-center justify-center gap-0">
          {steps.map((label, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep

            return (
              <div key={label} className="flex items-center">
                {/* Circle */}
                <div
                  className={[
                    'relative flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors duration-300',
                    isCompleted || isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-bg-secondary text-text-muted',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <motion.span
                      key={`check-mobile-${index}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                    </motion.span>
                  ) : (
                    <span>{index + 1}</span>
                  )}

                  {isCurrent && (
                    <motion.div
                      layout
                      className="absolute inset-0 rounded-full ring-2 ring-primary/40"
                      layoutId="active-ring-mobile"
                      transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                    />
                  )}
                </div>

                {/* Connecting line between circles */}
                {index < steps.length - 1 && (
                  <div className="relative w-8 h-px mx-0.5" aria-hidden="true">
                    <div className="absolute inset-0 bg-border" />
                    <motion.div
                      className="absolute inset-0 origin-left bg-primary"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isCompleted ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Current step label centered below the circles */}
        <motion.p
          key={currentStep}
          className="mt-3 text-center text-sm font-semibold text-primary"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {steps[currentStep]}
        </motion.p>
      </div>
    </div>
  )
}
