'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface DesktopWizardProgressSidebarProps {
  steps: string[]
  currentStep: number
}

export default function DesktopWizardProgressSidebar({ steps, currentStep }: DesktopWizardProgressSidebarProps) {
  return (
    <div className="flex flex-col gap-0">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isFuture = index > currentStep

        return (
          <div key={label} className="flex flex-col">
            {/* Step row */}
            <div className="flex items-center gap-3">
              {/* Circle */}
              <div className="relative">
                <div
                  className={[
                    'flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors duration-300',
                    isCompleted ? 'bg-white/30 text-white' : '',
                    isCurrent ? 'bg-white text-[var(--facility-primary)]' : '',
                    isFuture ? 'bg-white/10 text-white/40' : '',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Pulse ring on active step */}
                {isCurrent && (
                  <motion.div
                    layoutId="desktop-active-ring"
                    className="absolute inset-0 rounded-full ring-2 ring-white/40"
                    transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={[
                  'text-sm transition-colors duration-300',
                  isCompleted ? 'text-white/80 font-medium' : '',
                  isCurrent ? 'text-white font-semibold' : '',
                  isFuture ? 'text-white/40 font-medium' : '',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connecting line below (except last step) */}
            {index < steps.length - 1 && (
              <div className="ml-[17px] h-8 relative" aria-hidden="true">
                <div className="absolute inset-0 w-px bg-white/20" />
                <motion.div
                  className="absolute inset-0 w-px bg-white/60 origin-top"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: isCompleted ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
