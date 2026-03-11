import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@/lib/db/schema'

export type DrizzleInstance = PostgresJsDatabase<typeof schema>

export interface MessagingAuthContext {
  userId: string
  profileId: string
  isTrainer: boolean
  isAdmin: boolean
}
