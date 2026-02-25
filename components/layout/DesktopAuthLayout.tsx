'use client'

import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'

interface DesktopAuthLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export default function DesktopAuthLayout({ children, title, description }: DesktopAuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center overflow-y-auto px-4 py-12 relative">
      {/* Gradient mesh background */}
      <div className="gradient-mesh" />

      {/* Floating decorative orbs */}
      <motion.div
        className="fixed top-[10%] left-[15%] w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, var(--facility-primary), transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-[10%] right-[15%] w-[250px] h-[250px] rounded-full opacity-15 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, var(--facility-primary), transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{ y: [0, 15, 0], x: [0, -12, 0] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-5xl"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <GlassCard
          className="grid grid-cols-5 min-h-[560px] overflow-hidden"
          whileHover={{ boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)' }}
        >
          {/* Left branding panel */}
          <div
            className="col-span-2 flex flex-col justify-center items-center p-10 text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
            }}
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
              <span className="text-white text-3xl font-bold font-[--font-lexend]">F</span>
            </div>
            <h2 className="text-2xl font-bold font-[--font-lexend] mb-2">Forge</h2>
            <p className="text-white/70 text-sm text-center">
              Premium sports performance training
            </p>
          </div>

          {/* Right content panel */}
          <div className="col-span-3 p-12 flex flex-col justify-center">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary font-[--font-lexend]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-text-secondary">{description}</p>
            )}
            <div className="mt-8">
              {children}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
