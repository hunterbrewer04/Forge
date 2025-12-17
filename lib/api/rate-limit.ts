/**
 * API Rate Limiting Utilities (Phase 2)
 *
 * Provides rate limiting for API routes to prevent abuse
 * Uses in-memory storage suitable for Vercel's serverless environment
 *
 * NOTE: This is a basic implementation. For production with high traffic,
 * consider using Vercel KV + @upstash/ratelimit or similar distributed solution.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitError } from './errors'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory storage for rate limit tracking
// Note: This resets on serverless cold starts, which is acceptable for basic protection
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Optional custom key identifier (defaults to user ID or IP)
   */
  keyPrefix?: string
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const RateLimitPresets = {
  /**
   * General API endpoints - 60 requests per minute
   */
  GENERAL: {
    maxRequests: 60,
    windowSeconds: 60,
  } as RateLimitConfig,

  /**
   * Auth endpoints (login/signup) - 5 requests per minute per IP
   */
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60,
    keyPrefix: 'auth',
  } as RateLimitConfig,

  /**
   * Message sending - 30 requests per minute
   */
  MESSAGING: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: 'message',
  } as RateLimitConfig,

  /**
   * File uploads - 10 requests per minute
   */
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'upload',
  } as RateLimitConfig,

  /**
   * Strict rate limit for sensitive operations - 3 requests per minute
   */
  STRICT: {
    maxRequests: 3,
    windowSeconds: 60,
    keyPrefix: 'strict',
  } as RateLimitConfig,
} as const

/**
 * Gets the client identifier for rate limiting
 * Uses user ID if authenticated, falls back to IP address
 */
function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return userId
  }

  // Try to get IP from various headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Cleans up expired entries from the rate limit store
 * Prevents memory growth in long-running serverless functions
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const keysToDelete: string[] = []

  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

/**
 * Checks if a request should be rate limited
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @param userId - Optional authenticated user ID
 * @returns NextResponse error if rate limited, null if allowed
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await checkRateLimit(
 *     request,
 *     RateLimitPresets.MESSAGING,
 *     user.id
 *   )
 *   if (rateLimitResult) {
 *     return rateLimitResult // Rate limited
 *   }
 *   // Continue processing...
 * }
 * ```
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  // Cleanup expired entries periodically (every ~100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries()
  }

  const clientId = getClientIdentifier(request, userId)
  const key = config.keyPrefix
    ? `${config.keyPrefix}:${clientId}`
    : clientId

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return null
  }

  // Increment existing entry
  entry.count++

  if (entry.count > config.maxRequests) {
    // Rate limit exceeded
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000)
    return createRateLimitError(retryAfterSeconds)
  }

  return null
}

/**
 * Middleware-style rate limiter that wraps API route handlers
 *
 * @param handler - The API route handler function
 * @param config - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     // Your handler logic
 *     return NextResponse.json({ success: true })
 *   },
 *   RateLimitPresets.MESSAGING
 * )
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Extract user ID if available (requires auth first)
    // For public endpoints, this will use IP address
    const rateLimitResult = await checkRateLimit(request, config)

    if (rateLimitResult) {
      return rateLimitResult
    }

    return handler(request)
  }
}

/**
 * Gets current rate limit status for a client
 * Useful for adding rate limit headers to responses
 */
export function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): {
  limit: number
  remaining: number
  resetAt: number
} {
  const clientId = getClientIdentifier(request, userId)
  const key = config.keyPrefix
    ? `${config.keyPrefix}:${clientId}`
    : clientId

  const entry = rateLimitStore.get(key)
  const now = Date.now()

  if (!entry || entry.resetAt < now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: now + config.windowSeconds * 1000,
    }
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  }
}
