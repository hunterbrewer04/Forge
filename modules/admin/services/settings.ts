import { eq } from 'drizzle-orm'
import { facilitySettings } from '@/lib/db/schema'
import { uploadToR2 } from '@/modules/messaging/services/storage'
import type { DrizzleInstance } from '../config'
import type { SettingsUpdate } from '../types'

type SettingsRow = typeof facilitySettings.$inferSelect

function serializeSettings(s: SettingsRow) {
  return {
    id: s.id,
    name: s.name,
    logo_url: s.logoUrl,
    primary_color: s.primaryColor,
    business_hours: s.businessHours,
    booking_advance_notice: s.bookingAdvanceNotice,
    cancellation_window: s.cancellationWindow,
    notification_preferences: s.notificationPreferences,
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  }
}

export async function getSettings(db: DrizzleInstance) {
  const settings = await db.query.facilitySettings.findFirst()
  if (!settings) {
    // Return defaults when no settings row exists yet
    const now = new Date().toISOString()
    return {
      id: null,
      name: '',
      logo_url: null,
      primary_color: '#1973f0',
      business_hours: null,
      booking_advance_notice: null,
      cancellation_window: null,
      notification_preferences: null,
      created_at: now,
      updated_at: now,
    }
  }
  return serializeSettings(settings)
}

export async function updateSettings(
  db: DrizzleInstance,
  updates: SettingsUpdate & { logo_url?: string }
) {
  const existing = await db.query.facilitySettings.findFirst()

  // Map snake_case API fields to camelCase Drizzle fields
  const dbUpdates: Partial<typeof facilitySettings.$inferInsert> = { updatedAt: new Date() }
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.primary_color !== undefined) dbUpdates.primaryColor = updates.primary_color
  if (updates.business_hours !== undefined) dbUpdates.businessHours = updates.business_hours
  if (updates.booking_advance_notice !== undefined) dbUpdates.bookingAdvanceNotice = updates.booking_advance_notice
  if (updates.cancellation_window !== undefined) dbUpdates.cancellationWindow = updates.cancellation_window
  if (updates.notification_preferences !== undefined) dbUpdates.notificationPreferences = updates.notification_preferences
  if (updates.logo_url !== undefined) dbUpdates.logoUrl = updates.logo_url

  if (existing) {
    const [updated] = await db
      .update(facilitySettings)
      .set(dbUpdates)
      .where(eq(facilitySettings.id, existing.id))
      .returning()

    return serializeSettings(updated)
  } else {
    const [created] = await db
      .insert(facilitySettings)
      .values({
        name: updates.name || 'Forge',
        primaryColor: updates.primary_color || '#1973f0',
        ...dbUpdates,
      })
      .returning()

    return serializeSettings(created)
  }
}

export async function uploadLogo(
  key: string,
  body: Buffer | ArrayBuffer,
  contentType: string
) {
  await uploadToR2(key, body, contentType)
  return key
}
