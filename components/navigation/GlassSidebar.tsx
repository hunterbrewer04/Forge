'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useUnreadCount } from '@/lib/hooks/useUnreadCount'
import GlassCard from '@/components/ui/GlassCard'
import {
  Home,
  Calendar,
  User,
  Users,
  MessageCircle,
  LogOut,
  X,
} from '@/components/ui/icons'

type IconKey = 'home' | 'messages' | 'calendar' | 'profile' | 'clients'

interface NavItem {
  href: string
  iconKey: IconKey
  label: string
}

function SidebarIcon({ iconKey, size, strokeWidth }: { iconKey: IconKey; size: number; strokeWidth: number }) {
  switch (iconKey) {
    case 'home':
      return <Home size={size} strokeWidth={strokeWidth} />
    case 'messages':
      return <MessageCircle size={size} strokeWidth={strokeWidth} />
    case 'calendar':
      return <Calendar size={size} strokeWidth={strokeWidth} />
    case 'clients':
      return <Users size={size} strokeWidth={strokeWidth} />
    case 'profile':
      return <User size={size} strokeWidth={strokeWidth} />
  }
}

interface GlassSidebarProps {
  onSignOut?: () => void
  onClose?: () => void
}

export default function GlassSidebar({ onSignOut, onClose }: GlassSidebarProps) {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const { theme } = useFacilityTheme()

  const { unreadCount } = useUnreadCount({
    userId: user?.id,
    isTrainer: profile?.is_trainer,
    isClient: profile?.has_full_access,
  })

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const mainNavItems: NavItem[] = [
    { href: '/home', iconKey: 'home', label: 'Home' },
  ]

  // Messages - only for trainers and full-access users
  const messagesNavItem: NavItem[] =
    profile?.is_trainer || profile?.has_full_access
      ? [{ href: '/chat', iconKey: 'messages', label: 'Messages' }]
      : []

  const scheduleNavItem: NavItem[] = [
    { href: '/schedule', iconKey: 'calendar', label: 'Schedule' },
  ]

  const trainerNavItems: NavItem[] = profile?.is_trainer
    ? [{ href: '/trainer/clients', iconKey: 'clients', label: 'Clients' }]
    : []

  const allNavItems = [...mainNavItems, ...messagesNavItem, ...scheduleNavItem, ...trainerNavItems]

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
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="size-10 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xl">
            {theme.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary tracking-tight uppercase">
            {theme.name.split(' ')[0] || 'FORGE'}
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-wider">
            {theme.tagline}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
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
