'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import GlassCard from '@/components/ui/GlassCard'
import { LogOut, X, ChevronDown } from '@/components/ui/icons'
import { SidebarIcon, type IconKey } from '@/components/navigation/sidebar-icons'

interface NavItem {
  href: string
  iconKey: IconKey
  label: string
}

interface GlassSidebarProps {
  onSignOut?: () => void
  onClose?: () => void
}

export default function GlassSidebar({ onSignOut, onClose }: GlassSidebarProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [adminOpen, setAdminOpen] = useState(() => pathname.startsWith('/admin'))

  const { unreadCount } = useUnreadCount({
    userId: profile?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.has_full_access,
  })

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const isAdminActive = pathname.startsWith('/admin')

  const mainNavItems: NavItem[] = [
    { href: '/home', iconKey: 'home', label: 'Home' },
  ]

  const messagesNavItem: NavItem[] =
    profile?.is_trainer || profile?.has_full_access
      ? [{ href: '/chat', iconKey: 'messages', label: 'Messages' }]
      : []

  const scheduleNavItem: NavItem[] = [
    { href: '/schedule', iconKey: 'calendar', label: 'Schedule' },
  ]

  const trainerNavItems: NavItem[] = profile?.is_trainer
    ? [
        { href: '/trainer/sessions', iconKey: 'sessions', label: 'Sessions' },
        { href: '/trainer/clients', iconKey: 'clients', label: 'Clients' },
      ]
    : []

  const paymentsNavItem: NavItem[] =
    !profile?.is_trainer && (profile?.has_full_access || profile?.is_member)
      ? [{ href: '/payments', iconKey: 'payments', label: 'Payments' }]
      : []

  const adminSubItems: NavItem[] = [
    { href: '/admin/users', iconKey: 'admin-users', label: 'Users' },
    { href: '/admin/tiers', iconKey: 'admin-tiers', label: 'Tiers' },
    { href: '/admin/finances', iconKey: 'admin-finances', label: 'Finances' },
    { href: '/admin/settings', iconKey: 'admin-settings', label: 'Settings' },
  ]

  const allNavItems = [...mainNavItems, ...messagesNavItem, ...scheduleNavItem, ...trainerNavItems, ...paymentsNavItem]

  const bottomNavItems: NavItem[] = [
    { href: '/profile', iconKey: 'profile', label: 'Profile' },
  ]

  return (
    <GlassCard
      variant="subtle"
      className="hidden lg:flex flex-col w-64 xl:w-72 h-full rounded-none border-r border-border"
      initial={false}
    >
      {/* Facility Branding */}
      <div className="relative flex items-center justify-center px-6 py-6 border-b border-border">
        <Image
          src="/Forge-Full-Logo.PNG"
          alt="Forge Sports Performance"
          width={240}
          height={160}
          className="h-28 w-auto object-contain"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6">
        <ul className="space-y-1">
          {allNavItems.map((item, index) => (
            <motion.li
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: [0.25, 0.4, 0.25, 1],
              }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.href)
                    ? 'glass-subtle text-primary font-semibold'
                    : 'text-text-secondary hover:bg-bg-secondary/50 hover:text-text-primary'
                }`}
              >
                <SidebarIcon
                  iconKey={item.iconKey}
                  size={22}
                  strokeWidth={isActive(item.href) ? 2.5 : 2}
                />
                <span className="font-medium flex-1">{item.label}</span>
                {item.iconKey === 'messages' && unreadCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </motion.li>
          ))}

          {/* Admin Dropdown */}
          {profile?.is_admin && (
            <motion.li
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: allNavItems.length * 0.05,
                ease: [0.25, 0.4, 0.25, 1],
              }}
            >
              <div className="mt-2 mb-1 px-4">
                <div className="border-t border-border" />
              </div>
              <button
                onClick={() => setAdminOpen((prev) => !prev)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full ${
                  isAdminActive
                    ? 'glass-subtle text-primary font-semibold'
                    : 'text-text-secondary hover:bg-bg-secondary/50 hover:text-text-primary'
                }`}
              >
                <SidebarIcon
                  iconKey="admin"
                  size={22}
                  strokeWidth={isAdminActive ? 2.5 : 2}
                />
                <span className="font-medium flex-1 text-left">Admin Panel</span>
                <motion.span
                  animate={{ rotate: adminOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {adminOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    {adminSubItems.map((item, index) => (
                      <motion.li
                        key={item.href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.05,
                          ease: [0.25, 0.4, 0.25, 1],
                        }}
                      >
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 pl-8 pr-4 py-2.5 rounded-xl transition-all ${
                            isActive(item.href)
                              ? 'glass-subtle text-primary font-semibold'
                              : 'text-text-secondary hover:bg-bg-secondary/50 hover:text-text-primary'
                          }`}
                        >
                          <SidebarIcon
                            iconKey={item.iconKey}
                            size={18}
                            strokeWidth={isActive(item.href) ? 2.5 : 2}
                          />
                          <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
          )}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-6 space-y-1">
        {bottomNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive(item.href)
                ? 'glass-subtle text-primary font-semibold'
                : 'text-text-secondary hover:bg-bg-secondary/50 hover:text-text-primary'
            }`}
          >
            <SidebarIcon
              iconKey={item.iconKey}
              size={22}
              strokeWidth={isActive(item.href) ? 2.5 : 2}
            />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
          >
            <LogOut size={22} strokeWidth={2} />
            <span className="font-medium">Log Out</span>
          </button>
        )}
      </div>
    </GlassCard>
  )
}
