import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  numeric,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// Enums
// ============================================================================

export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'cancelled',
  'completed',
])

export const bookingStatusEnum = pgEnum('booking_status', [
  'confirmed',
  'cancelled',
  'attended',
  'no_show',
])

export const membershipStatusEnum = pgEnum('membership_status', [
  'active',
  'past_due',
  'canceled',
])

export const mediaTypeEnum = pgEnum('media_type', ['image', 'video'])

// ============================================================================
// Tables
// ============================================================================

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  username: text('username'),
  email: text('email'),
  isTrainer: boolean('is_trainer').notNull().default(false),
  hasFullAccess: boolean('has_full_access').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  isMember: boolean('is_member').notNull().default(false),
  membershipStatus: text('membership_status'),
  membershipTierId: uuid('membership_tier_id').references(() => membershipTiers.id),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  calendarToken: text('calendar_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const membershipTiers = pgTable('membership_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  stripePriceId: text('stripe_price_id').notNull(),
  stripeProductId: text('stripe_product_id'),
  monthlyBookingQuota: integer('monthly_booking_quota').notNull(),
  priceMonthly: numeric('price_monthly').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessionTypes = pgTable('session_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainerId: uuid('trainer_id').notNull().references(() => profiles.id),
  sessionTypeId: uuid('session_type_id').references(() => sessionTypes.id),
  title: text('title').notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  capacity: integer('capacity'),
  isPremium: boolean('is_premium').notNull().default(false),
  location: text('location'),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: sessionStatusEnum('status').notNull().default('scheduled'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  clientId: uuid('client_id').notNull().references(() => profiles.id),
  status: bookingStatusEnum('status').notNull().default('confirmed'),
  bookedAt: timestamp('booked_at', { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => profiles.id),
  trainerId: uuid('trainer_id').notNull().references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id),
  senderId: uuid('sender_id').notNull().references(() => profiles.id),
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaType: mediaTypeEnum('media_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
})

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    endpoint: text('endpoint').notNull(),
    authKey: text('auth_key').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('push_subscriptions_user_endpoint_idx').on(table.userId, table.endpoint),
  ]
)

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const facilitySettings = pgTable('facility_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default('Forge'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color').notNull().default('#1973f0'),
  businessHours: jsonb('business_hours'),
  bookingAdvanceNotice: integer('booking_advance_notice'),
  cancellationWindow: integer('cancellation_window'),
  notificationPreferences: jsonb('notification_preferences'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const trainerClients = pgTable('trainer_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainerId: uuid('trainer_id').notNull().references(() => profiles.id),
  clientId: uuid('client_id').notNull().references(() => profiles.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('trainer_clients_trainer_client_idx').on(table.trainerId, table.clientId),
])

// ============================================================================
// Relations
// ============================================================================

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  membershipTier: one(membershipTiers, {
    fields: [profiles.membershipTierId],
    references: [membershipTiers.id],
  }),
  trainerSessions: many(sessions),
  bookings: many(bookings),
  clientConversations: many(conversations, { relationName: 'client' }),
  trainerConversations: many(conversations, { relationName: 'trainer' }),
  sentMessages: many(messages),
  pushSubscriptions: many(pushSubscriptions),
  auditLogs: many(auditLogs),
  clientAssignments: many(trainerClients, { relationName: 'clientAssignments' }),
  trainerAssignments: many(trainerClients, { relationName: 'trainerAssignments' }),
}))

export const membershipTiersRelations = relations(membershipTiers, ({ many }) => ({
  profiles: many(profiles),
}))

export const sessionTypesRelations = relations(sessionTypes, ({ many }) => ({
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  trainer: one(profiles, {
    fields: [sessions.trainerId],
    references: [profiles.id],
  }),
  sessionType: one(sessionTypes, {
    fields: [sessions.sessionTypeId],
    references: [sessionTypes.id],
  }),
  bookings: many(bookings),
}))

export const bookingsRelations = relations(bookings, ({ one }) => ({
  session: one(sessions, {
    fields: [bookings.sessionId],
    references: [sessions.id],
  }),
  client: one(profiles, {
    fields: [bookings.clientId],
    references: [profiles.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  client: one(profiles, {
    fields: [conversations.clientId],
    references: [profiles.id],
    relationName: 'client',
  }),
  trainer: one(profiles, {
    fields: [conversations.trainerId],
    references: [profiles.id],
    relationName: 'trainer',
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(profiles, {
    fields: [pushSubscriptions.userId],
    references: [profiles.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(profiles, {
    fields: [auditLogs.userId],
    references: [profiles.id],
  }),
}))

export const trainerClientsRelations = relations(trainerClients, ({ one }) => ({
  trainer: one(profiles, {
    fields: [trainerClients.trainerId],
    references: [profiles.id],
    relationName: 'clientAssignments',
  }),
  client: one(profiles, {
    fields: [trainerClients.clientId],
    references: [profiles.id],
    relationName: 'trainerAssignments',
  }),
}))
