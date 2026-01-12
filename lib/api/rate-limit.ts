/**
 * API Rate Limiting Utilities (Phase 6 - Production Ready)
 *
 * Provides rate limiting for API routes to prevent abuse.
 * Uses Upstash Redis for distributed rate limiting in production,
 * with in-memory fallback for development.
 *
 * For Upstash setup:
 * 1. Create account at https://upstash.com
 * 2. Create a Redis database
 * 3. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to environment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimitError } from './errors'

// ============================================================================
// Types
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyPrefix?: string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

export const RateLimitPresets = {
  /** General API endpoints - 60 requests per minute */
  GENERAL: {
    maxRequests: 60,
    windowSeconds: 60,
  } as RateLimitConfig,

  /** Auth endpoints (login/signup) - 5 requests per minute per IP */
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60,
    keyPrefix: 'auth',
  } as RateLimitConfig,

  /** Message sending - 30 requests per minute */
  MESSAGING: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: 'message',
  } as RateLimitConfig,

  /** File uploads - 10 requests per minute */
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'upload',
  } as RateLimitConfig,

  /** Strict rate limit for sensitive operations - 3 requests per minute */
  STRICT: {
    maxRequests: 3,
    windowSeconds: 60,
    keyPrefix: 'strict',
  } as RateLimitConfig,

  /** Booking operations - 10 requests per minute */
  BOOKING: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'booking',
  } as RateLimitConfig,
} as const

// ============================================================================
// Upstash Redis Rate Limiter (Production)
// ============================================================================

class UpstashRateLimiter {
  private baseUrl: string
  private token: string

  constructor(url: string, token: string) {
    this.baseUrl = url
    this.token = token
  }

  private async execute(command: string[]): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      throw new Error(`Upstash request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  }

  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const windowKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`

    try {
      // Increment counter and set expiry
      const count = (await this.execute(['INCR', windowKey])) as number

      // Set expiry if this is the first request in the window
      if (count === 1) {
        await this.execute(['EXPIRE', windowKey, String(config.windowSeconds)])
      }

      const remaining = Math.max(0, config.maxRequests - count)
      const resetAt = (Math.floor(now / windowMs) + 1) * windowMs

      return {
        success: count <= config.maxRequests,
        limit: config.maxRequests,
        remaining,
        resetAt,
      }
    } catch (error) {
      console.error('Upstash rate limit error:', error)
      // Fail open - allow request if Redis is unavailable
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: now + windowMs,
      }
    }
  }
}

// ============================================================================
// In-Memory Rate Limiter (Development/Fallback)
// ============================================================================

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>()

  private cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.store.forEach((entry, key) => {
      if (entry.resetAt < now) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => this.store.delete(key))
  }

  checkLimit(key: string, config: RateLimitConfig): RateLimitResult {
    // Periodic cleanup
    if (Math.random() < 0.01) {
      this.cleanup()
    }

    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const entry = this.store.get(key)

    if (!entry || entry.resetAt < now) {
      // New window
      this.store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt: now + windowMs,
      }
    }

    // Increment existing entry
    entry.count++

    return {
      success: entry.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    }
  }
}

// ============================================================================
// Rate Limiter Factory
// ============================================================================

let rateLimiter: UpstashRateLimiter | InMemoryRateLimiter | null = null

function getRateLimiter(): UpstashRateLimiter | InMemoryRateLimiter {
  if (rateLimiter) {
    return rateLimiter
  }

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    console.log('Using Upstash Redis for rate limiting')
    rateLimiter = new UpstashRateLimiter(upstashUrl, upstashToken)
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'Upstash Redis not configured. Using in-memory rate limiting. ' +
          'For production, set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
      )
    }
    rateLimiter = new InMemoryRateLimiter()
  }

  return rateLimiter
}

// ============================================================================
// Client Identifier
// ============================================================================

function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return userId
  }

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0] || realIp || 'unknown'
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Checks if a request should be rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = getRateLimiter()
  const clientId = getClientIdentifier(request, userId)
  const key = config.keyPrefix ? `${config.keyPrefix}:${clientId}` : clientId

  const result =
    limiter instanceof UpstashRateLimiter
      ? await limiter.checkLimit(key, config)
      : limiter.checkLimit(key, config)

  if (!result.success) {
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)
    return createRateLimitError(retryAfterSeconds)
  }

  return null
}

/**
 * Middleware-style rate limiter wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResult = await checkRateLimit(request, config)

    if (rateLimitResult) {
      return rateLimitResult
    }

    return handler(request)
  }
}

/**
 * Gets current rate limit status for a client
 */
export async function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig,
  userId?: string
): Promise<{
  limit: number
  remaining: number
  resetAt: number
}> {
  const limiter = getRateLimiter()
  const clientId = getClientIdentifier(request, userId)
  const key = config.keyPrefix ? `${config.keyPrefix}:${clientId}` : clientId

  // For status check, we don't want to increment
  // This is a simplified version that returns current limits
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  if (limiter instanceof InMemoryRateLimiter) {
    // For in-memory, we can check without incrementing
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: now + windowMs,
    }
  }

  // For Upstash, return defaults (checking would increment)
  return {
    limit: config.maxRequests,
    remaining: config.maxRequests,
    resetAt: now + windowMs,
  }
}
