export type { DrizzleInstance } from '@/lib/db/types'

export interface MessagingAuthContext {
  userId: string
  profileId: string
  isTrainer: boolean
  isAdmin: boolean
}
