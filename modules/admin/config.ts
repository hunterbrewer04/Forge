export type { DrizzleInstance } from '@/lib/db/types'

export interface AdminAuthContext {
  userId: string
  profileId: string
  isAdmin: boolean
}
