import { eq } from 'drizzle-orm'
import { facilitySettings } from '@/lib/db/schema'
import { uploadToR2 } from '@/modules/messaging/services/storage'
import type { DrizzleInstance } from '../config'

export async function getSettings(db: DrizzleInstance) {
  const settings = await db.query.facilitySettings.findFirst()

  if (!settings) return null

  return {
    id: settings.id,
    name: settings.name,
    logo_url: settings.logoUrl,
    primary_color: settings.primaryColor,
    business_hours: settings.businessHours,
    booking_advance_notice: settings.bookingAdvanceNotice,
    cancellation_window: settings.cancellationWindow,
    notification_preferences: settings.notificationPreferences,
    created_at: settings.createdAt.toISOString(),
    updated_at: settings.updatedAt.toISOString(),
  }
}

export async function updateSettings(
  db: DrizzleInstance,
  updates: Record<string, unknown>
) {
  const existing = await db.query.facilitySettings.findFirst()

  // Map snake_case API fields to camelCase Drizzle fields
  const dbUpdates: Record<string, unknown> = { updatedAt: new Date() }
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

    return {
      id: updated.id,
      name: updated.name,
      logo_url: updated.logoUrl,
      primary_color: updated.primaryColor,
      business_hours: updated.businessHours,
      booking_advance_notice: updated.bookingAdvanceNotice,
      cancellation_window: updated.cancellationWindow,
      notification_preferences: updated.notificationPreferences,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
    }
  } else {
    // Create initial settings row
    const [created] = await db
      .insert(facilitySettings)
      .values({
        name: (updates.name as string) || 'Forge',
        primaryColor: (updates.primary_color as string) || '#1973f0',
        ...dbUpdates,
      })
      .returning()

    return {
      id: created.id,
      name: created.name,
      logo_url: created.logoUrl,
      primary_color: created.primaryColor,
      business_hours: created.businessHours,
      booking_advance_notice: created.bookingAdvanceNotice,
      cancellation_window: created.cancellationWindow,
      notification_preferences: created.notificationPreferences,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString(),
    }
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
