'use client'

import {
  Home,
  Calendar,
  User,
  Users,
  MessageCircle,
  Dumbbell,
  Wallet,
  Settings,
  CreditCard,
  TrendingUp,
  Settings2,
} from '@/components/ui/icons'
import type { LucideIcon } from '@/components/ui/icons'

export const SIDEBAR_ICON_MAP = {
  home: Home,
  messages: MessageCircle,
  calendar: Calendar,
  clients: Users,
  sessions: Dumbbell,
  payments: Wallet,
  profile: User,
  'admin-users': Settings,
  'admin-tiers': CreditCard,
  'admin-finances': TrendingUp,
  'admin-settings': Settings2,
} as const satisfies Record<string, LucideIcon>

export type IconKey = keyof typeof SIDEBAR_ICON_MAP

export function SidebarIcon({ iconKey, size, strokeWidth }: { iconKey: IconKey; size: number; strokeWidth: number }) {
  const Icon = SIDEBAR_ICON_MAP[iconKey]
  return <Icon size={size} strokeWidth={strokeWidth} />
}
