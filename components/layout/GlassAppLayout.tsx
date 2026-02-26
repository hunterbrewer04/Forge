'use client'

import { motion } from 'framer-motion'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { useAuth } from '@/contexts/AuthContext'
import GlassSidebar from '@/components/navigation/GlassSidebar'
import MobileLayout from '@/components/layout/MobileLayout'

interface GlassAppLayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
  showNotifications?: boolean
  showMenu?: boolean
  showBottomNav?: boolean
  topBarLeftContent?: React.ReactNode
  topBarRightContent?: React.ReactNode
  notificationCount?: number
  customHeader?: React.ReactNode
  hideTopBar?: boolean
  /** Title shown in the desktop glass header bar */
  desktopTitle?: string
  /** Hide the desktop header entirely (e.g. home page has its own) */
  hideDesktopHeader?: boolean
  /** Right-side actions for the desktop header */
  desktopHeaderRight?: React.ReactNode
}

export default function GlassAppLayout({
  children,
  desktopTitle,
  hideDesktopHeader = false,
  desktopHeaderRight,
  ...mobileProps
}: GlassAppLayoutProps) {
  const isDesktop = useIsDesktop()
  const { signOut } = useAuth()

  // On mobile/tablet (<1024px), render existing MobileLayout unchanged
  if (!isDesktop) {
    return <MobileLayout {...mobileProps}>{children}</MobileLayout>
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/member/login'
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
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

      {/* Glass Sidebar */}
      <GlassSidebar onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Desktop page header */}
        {!hideDesktopHeader && (
          <div className="glass-subtle border-b border-white/10 px-8 py-5 sticky top-0 z-20">
            <div className="max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {desktopTitle || mobileProps.title || ''}
              </h1>
              {desktopHeaderRight}
            </div>
          </div>
        )}

        {/* Page content with entrance animation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="max-w-5xl xl:max-w-6xl mx-auto px-8 py-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
