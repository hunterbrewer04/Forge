'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'
import { useAuth } from '@/contexts/AuthContext'
import GlassSidebar from '@/components/navigation/GlassSidebar'
import MobileLayout from '@/components/layout/MobileLayout'
import { Menu } from '@/components/ui/icons'

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

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-open') !== 'false'
    }
    return true
  })

  useEffect(() => {
    localStorage.setItem('sidebar-open', String(sidebarOpen))
  }, [sidebarOpen])

  // On mobile/tablet (<1024px), render existing MobileLayout unchanged
  if (!isDesktop) {
    return <MobileLayout {...mobileProps}>{children}</MobileLayout>
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/member/login'
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg-primary">
      {/* Glass Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <GlassSidebar onSignOut={handleSignOut} onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Desktop page header */}
        {!hideDesktopHeader && (
          <div className="glass border-b border-border px-8 py-5 sticky top-0 z-20">
            <div className="max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(prev => !prev)}
                  className="size-9 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
                  aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                  <Menu size={20} />
                </button>
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                  {desktopTitle || mobileProps.title || ''}
                </h1>
              </div>
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
