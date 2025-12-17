/**
 * API Request Validation Utilities (Phase 2)
 *
 * Provides request body validation using Zod schemas
 * Sanitizes and validates input to prevent injection attacks
 */

import { NextRequest } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { createValidationError } from './errors'

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  /**
   * UUID validation
   */
  uuid: z.string().uuid(),

  /**
   * Email validation
   */
  email: z.string().email(),

  /**
   * Non-empty string
   */
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),

  /**
   * Positive integer
   */
  positiveInt: z.number().int().positive(),

  /**
   * Pagination limit (1-100)
   */
  paginationLimit: z.number().int().min(1).max(100).default(20),

  /**
   * Pagination offset (0+)
   */
  paginationOffset: z.number().int().min(0).default(0),
} as const

/**
 * Validates request body against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse error
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * })
 *
 * export async function POST(request: NextRequest) {
 *   const result = await validateRequestBody(request, schema)
 *   if (result instanceof NextResponse) {
 *     return result // Validation error
 *   }
 *   const { email, password } = result
 *   // Continue with validated data...
 * }
 * ```
 */
export async function validateRequestBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T> | ReturnType<typeof createValidationError>> {
  try {
    // Parse request body
    const body = await request.json()

    // Validate against schema
    const validatedData = schema.parse(body)

    return validatedData
  } catch (error) {
    if (error instanceof ZodError) {
      // Extract field names from Zod errors
      const fields = error.errors.map(err => err.path.join('.'))
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)

      return createValidationError(
        fields,
        `Validation failed: ${messages.join(', ')}`
      )
    }

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return createValidationError(
        ['body'],
        'Invalid JSON in request body'
      )
    }

    // Handle other errors
    console.error('Unexpected validation error:', error)
    return createValidationError(
      ['unknown'],
      'Request validation failed'
    )
  }
}

/**
 * Validates query parameters against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated data or NextResponse error
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   page: z.coerce.number().int().positive().default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 * })
 *
 * export async function GET(request: NextRequest) {
 *   const result = await validateQueryParams(request, schema)
 *   if (result instanceof NextResponse) {
 *     return result
 *   }
 *   const { page, limit } = result
 *   // Continue with validated params...
 * }
 * ```
 */
export async function validateQueryParams<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T> | ReturnType<typeof createValidationError>> {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const params: Record<string, string | string[]> = {}

    searchParams.forEach((value, key) => {
      const existing = params[key]
      if (existing) {
        // Handle multiple values for the same key
        params[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value]
      } else {
        params[key] = value
      }
    })

    // Validate against schema
    const validatedData = schema.parse(params)

    return validatedData
  } catch (error) {
    if (error instanceof ZodError) {
      const fields = error.errors.map(err => err.path.join('.'))
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)

      return createValidationError(
        fields,
        `Query parameter validation failed: ${messages.join(', ')}`
      )
    }

    console.error('Unexpected query validation error:', error)
    return createValidationError(
      ['unknown'],
      'Query parameter validation failed'
    )
  }
}

/**
 * Sanitizes a string to prevent XSS and injection attacks
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
}

/**
 * Validates that a value is a valid UUID
 *
 * @param value - Value to check
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Example schemas for common API operations
 */
export const ExampleSchemas = {
  /**
   * Message creation schema
   */
  createMessage: z.object({
    conversation_id: CommonSchemas.uuid,
    content: z.string().min(1).max(5000),
    media_urls: z.array(z.string().url()).optional(),
  }),

  /**
   * Conversation creation schema
   */
  createConversation: z.object({
    trainer_id: CommonSchemas.uuid.optional(),
    client_id: CommonSchemas.uuid.optional(),
  }),

  /**
   * Pagination query schema
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: CommonSchemas.paginationLimit,
  }),

  /**
   * Mark message as read schema
   */
  markAsRead: z.object({
    message_id: CommonSchemas.uuid,
  }),
} as const
