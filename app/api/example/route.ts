/**
 * Example API Route with Full Security Implementation (Phase 2)
 *
 * This is a reference implementation showing all security features:
 * - Authentication validation
 * - Rate limiting
 * - Request validation
 * - Error handling
 * - Proper use of Supabase clients from Phase 1
 *
 * Copy this pattern when creating new API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  validateAuth,
  checkRateLimit,
  validateRequestBody,
  createApiError,
  handleUnexpectedError,
  RateLimitPresets,
} from '@/lib/api'

/**
 * Define request schema for validation
 */
const RequestSchema = z.object({
  message: z.string().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

/**
 * GET /api/example
 *
 * Example GET endpoint with authentication and rate limiting
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit (60 requests per minute)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Process request
    // In a real endpoint, you would fetch data from the database here
    const data = {
      message: 'This is a secure API endpoint',
      userId: user.id,
      timestamp: new Date().toISOString(),
    }

    // 4. Return successful response
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    // 5. Handle unexpected errors safely
    return handleUnexpectedError(error, 'GET /api/example')
  }
}

/**
 * POST /api/example
 *
 * Example POST endpoint with authentication, rate limiting, and request validation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Check rate limit (stricter for POST operations)
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.MESSAGING,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Validate request body
    const validationResult = await validateRequestBody(request, RequestSchema)
    if (validationResult instanceof NextResponse) {
      return validationResult
    }
    const { message, priority } = validationResult

    // 4. Process request
    // In a real endpoint, you would:
    // - Use createServerClient() from @/lib/supabase-server for user-scoped operations
    // - Use createAdminClient() from @/lib/supabase-admin only when necessary
    // - Never trust client-provided user IDs - always use auth.uid() or the validated user.id

    // Example of safe database operation:
    /*
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id, // Use validated user ID
        content: message,
        priority: priority,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return createApiError(
        'Failed to create message',
        500,
        'DATABASE_ERROR'
      )
    }
    */

    const data = {
      success: true,
      message: 'Data processed successfully',
      userId: user.id,
      receivedMessage: message,
      priority: priority,
      timestamp: new Date().toISOString(),
    }

    // 5. Return successful response
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    // 6. Handle unexpected errors safely
    return handleUnexpectedError(error, 'POST /api/example')
  }
}

/**
 * Example of an admin-only endpoint
 *
 * Uncomment and modify as needed
 */
/*
export async function DELETE(request: NextRequest) {
  try {
    // 1. Validate authentication AND role
    const authResult = await validateRole(request, 'admin')
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

    // 2. Strict rate limit for admin operations
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.STRICT,
      user.id
    )
    if (rateLimitResult) {
      return rateLimitResult
    }

    // 3. Process admin operation
    // Use createAdminClient() for operations that require bypassing RLS
    // Be VERY careful with admin operations!

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return handleUnexpectedError(error, 'DELETE /api/example')
  }
}
*/
