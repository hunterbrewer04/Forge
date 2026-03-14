import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { getSettings, updateSettings } from '@/modules/admin/services/settings'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  business_hours: z.record(z.object({
    open: z.string(),
    close: z.string(),
  })).optional(),
  booking_advance_notice: z.number().int().min(0).optional(),
  cancellation_window: z.number().int().min(0).optional(),
  notification_preferences: z.record(z.boolean()).optional(),
}).strict()

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const settings = await getSettings(db)
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-settings-get')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, updateSchema)
    if (body instanceof NextResponse) return body

    const updated = await updateSettings(db, body)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-settings-update')
  }
}
