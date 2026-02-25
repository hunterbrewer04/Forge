'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import DesktopAuthLayout from './DesktopAuthLayout'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return <DesktopAuthLayout title={title} description={description}>{children}</DesktopAuthLayout>
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-y-auto bg-bg-secondary px-4 py-12"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--facility-primary) 6%, transparent) 0%, transparent 70%)`,
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/forge-logo.png" alt="Forge" width={640} height={320} className="h-72 w-auto" priority />
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary font-[--font-lexend]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-text-secondary">{description}</p>
          )}
        </div>

        {/* Card */}
        <div
          className="
            bg-bg-card border border-border rounded-2xl shadow-xl
            p-6
            md:p-8
            lg:p-10
            mx-4 md:mx-0
          "
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
