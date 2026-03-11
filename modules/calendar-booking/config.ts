import type { DrizzleInstance } from '@/lib/db/types'
export type { DrizzleInstance }

export interface CalendarBookingAuthContext {
  userId: string
  profileId: string
  isTrainer: boolean
  isAdmin: boolean
  isMember: boolean
  hasFullAccess: boolean
  membershipTierId?: string
  membershipStatus?: string
}

export interface CalendarBookingConfig {
  db: DrizzleInstance
  audit?: (event: { action: string; resourceId: string; meta?: object }) => Promise<void>
}
