/**
 * API Error Handling Utilities (Phase 2)
 *
 * Provides consistent error responses for API routes
 * Prevents information leakage while maintaining debuggability
 */

import { NextResponse } from 'next/server'

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string
  code?: string
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication errors (401)
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NO_SESSION: 'NO_SESSION',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  FORBIDDEN: 'FORBIDDEN',

  // Client errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Not found errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTH_INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
  ROLE_VALIDATION_ERROR: 'ROLE_VALIDATION_ERROR',
  ROLE_VERIFICATION_FAILED: 'ROLE_VERIFICATION_FAILED',
} as const

/**
 * Creates a standardized API error response
 *
 * @param message - User-friendly error message (never expose internal details)
 * @param status - HTTP status code
 * @param code - Error code for client-side handling
 * @param details - Optional additional details (for debugging only, sanitized)
 * @returns NextResponse with error payload
 *
 * @example
 * ```typescript
 * return createApiError('Invalid request', 400, 'VALIDATION_ERROR', {
 *   fields: ['email', 'password']
 * })
 * ```
 */
export function createApiError(
  message: string,
  status: number,
  code?: string,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const errorResponse: ApiErrorResponse = {
    error: message,
    code,
    timestamp: new Date().toISOString(),
  }

  // Only include details in development or if explicitly provided
  if (details && process.env.NODE_ENV === 'development') {
    errorResponse.details = details
  }

  return NextResponse.json(errorResponse, { status })
}

/**
 * Creates a validation error response
 *
 * @param fields - Array of field names that failed validation
 * @param customMessage - Optional custom error message
 * @returns NextResponse with validation error
 */
export function createValidationError(
  fields: string[],
  customMessage?: string
): NextResponse<ApiErrorResponse> {
  const message = customMessage || `Validation failed for: ${fields.join(', ')}`

  return createApiError(message, 400, ErrorCodes.VALIDATION_ERROR, {
    fields,
  })
}

/**
 * Creates a rate limit error response with Retry-After header
 *
 * @param retryAfterSeconds - Number of seconds until rate limit resets
 * @returns NextResponse with rate limit error
 */
export function createRateLimitError(
  retryAfterSeconds: number
): NextResponse<ApiErrorResponse> {
  const response = createApiError(
    'Too many requests. Please try again later.',
    429,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    {
      retryAfter: retryAfterSeconds,
    }
  )

  response.headers.set('Retry-After', retryAfterSeconds.toString())

  return response
}

/**
 * Handles unexpected errors safely without leaking internal details
 *
 * @param error - The caught error
 * @param context - Context string for logging (e.g., 'create-conversation')
 * @returns NextResponse with generic error message
 */
export function handleUnexpectedError(
  error: unknown,
  context: string
): NextResponse<ApiErrorResponse> {
  // Log the full error server-side for debugging
  console.error(`[${context}] Unexpected error:`, error)

  // Return generic error to client (never expose stack traces or internal details)
  return createApiError(
    'An unexpected error occurred. Please try again later.',
    500,
    ErrorCodes.INTERNAL_ERROR
  )
}
