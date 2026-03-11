import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type {
  profiles,
  membershipTiers,
  sessionTypes,
  sessions,
  bookings,
  conversations,
  messages,
  pushSubscriptions,
  auditLogs,
} from './schema'
import type * as schema from './schema'

// Drizzle database instance type — shared across all modules
export type DrizzleInstance = PostgresJsDatabase<typeof schema>

// Select types (read from DB)
export type Profile = typeof profiles.$inferSelect
export type MembershipTier = typeof membershipTiers.$inferSelect
export type SessionType = typeof sessionTypes.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect

// Insert types (write to DB)
export type NewProfile = typeof profiles.$inferInsert
export type NewMembershipTier = typeof membershipTiers.$inferInsert
export type NewSessionType = typeof sessionTypes.$inferInsert
export type NewSession = typeof sessions.$inferInsert
export type NewBooking = typeof bookings.$inferInsert
export type NewConversation = typeof conversations.$inferInsert
export type NewMessage = typeof messages.$inferInsert
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
export type NewAuditLog = typeof auditLogs.$inferInsert
