/**
 * Public Guest Booking API Route (v1)
 *
 * POST /api/v1/bookings - Create a guest booking (no auth required)
 *
 * Accepts guest details, finds or creates a guest profile,
 * then calls the atomic book_session RPC. Includes honeypot
 * spam protection and IP-based rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminClient } from '@/lib/supabase-admin'
import { checkRateLimit, RateLimitConfig } from '@/lib/api/rate-limit'
import { validateRequestBody, CommonSchemas, sanitizeString } from '@/lib/api/validation'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { logAuditEventFromRequest } from '@/lib/services/audit'
import type { BookSessionResult } from '@/lib/types/sessions'

// ============================================================================
// Schema & Rate Limit Config
// ============================================================================

const GuestBookingSchema = z.object({
  sessionId: CommonSchemas.uuid,
  fullName: z.string().min(1).max(200).transform(sanitizeString),
  email: CommonSchemas.email,
  phone: z.string().min(7).max(20),
  honeypot: z.string().optional().default(''), // silently accept any value; checked post-validation
})

const GUEST_BOOKING_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowSeconds: 3600, // 1 hour
  keyPrefix: 'guest-booking',
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * POST /api/v1/bookings
 *
 * Creates a booking for a guest user. Finds or creates a guest profile
 * by email, then uses the atomic book_session database function.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request body
    const body = await validateRequestBody(request, GuestBookingSchema)
    if (body instanceof NextResponse) {
      return body
    }

    // 2. Honeypot check — silent reject for bots
    if (body.honeypot) {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // 3. IP-based rate limit (no userId — guest endpoint)
    const rateLimitResult = await checkRateLimit(request, GUEST_BOOKING_RATE_LIMIT)
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 4. Email-based rate limit: 3 bookings per email per day
    const emailRateLimitResult = await checkRateLimit(
      request,
      { maxRequests: 3, windowSeconds: 86400, keyPrefix: 'guest-booking-email' },
      body.email
    )
    if (emailRateLimitResult) {
      return emailRateLimitResult
    }

    const supabase = getAdminClient()

    // 5. Find or create guest profile by email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle()

    if (profileError) {
      console.error('Error looking up guest profile:', { code: profileError?.code, message: profileError?.message })
      return createApiError('Failed to process guest profile', 500, 'DATABASE_ERROR')
    }

    let guestProfileId: string

    if (existingProfile) {
      guestProfileId = existingProfile.id
    } else {
      // Create a new guest profile
      const newId = crypto.randomUUID()
      const { error: insertError } = await supabase.from('profiles').insert({
        id: newId,
        email: body.email,
        full_name: body.fullName,
        is_guest: true,
        is_client: true,
        is_trainer: false,
        is_admin: false,
      })

      if (insertError) {
        console.error('Error creating guest profile:', { code: insertError?.code, message: insertError?.message })
        return createApiError('Failed to create guest profile', 500, 'DATABASE_ERROR')
      }

      guestProfileId = newId
    }

    // 6. Call atomic booking function
    const { data: bookingResult, error: bookingError } = await supabase.rpc('book_session', {
      p_session_id: body.sessionId,
      p_client_id: guestProfileId,
    })

    if (bookingError) {
      console.error('Error booking session:', { code: bookingError?.code, message: bookingError?.message })
      return createApiError('Failed to book session', 500, 'DATABASE_ERROR')
    }

    // 7. Map RPC result errors
    const result = (bookingResult as BookSessionResult[] | null)?.[0]

    if (!result?.success) {
      const errorMessage = result?.error_message || 'Failed to book session'

      if (errorMessage.includes('not found')) {
        return createApiError(errorMessage, 404, 'RESOURCE_NOT_FOUND')
      }
      if (errorMessage.includes('already booked')) {
        return createApiError(errorMessage, 409, 'ALREADY_BOOKED')
      }
      if (errorMessage.includes('fully booked')) {
        return createApiError(errorMessage, 409, 'SESSION_FULL')
      }
      if (errorMessage.includes('not available')) {
        return createApiError(errorMessage, 400, 'SESSION_NOT_AVAILABLE')
      }

      return createApiError(errorMessage, 400, 'BOOKING_FAILED')
    }

    // 8. Audit log the guest booking
    await logAuditEventFromRequest({
      userId: guestProfileId,
      action: 'BOOKING_CREATE',
      resource: 'booking',
      resourceId: result.booking_id ?? undefined,
      metadata: {
        session_id: body.sessionId,
        guest_email: body.email,
        is_guest_booking: true,
      },
    })

    // 9. Return success
    return NextResponse.json(
      { success: true, bookingId: result.booking_id },
      { status: 201 }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'v1-guest-booking')
  }
}
