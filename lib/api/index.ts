/**
 * API Utilities (Phase 2)
 *
 * Centralized exports for all API security utilities
 * Import from this file for consistent API development
 *
 * @example
 * ```typescript
 * import { validateAuth, checkRateLimit, validateRequestBody, createApiError } from '@/lib/api'
 * ```
 */

// Authentication
export {
  validateAuth,
  validateRole,
} from './auth'

// Rate Limiting
export {
  checkRateLimit,
  withRateLimit,
  getRateLimitStatus,
  RateLimitPresets,
  type RateLimitConfig,
} from './rate-limit'

// Request Validation
export {
  validateRequestBody,
  validateQueryParams,
  sanitizeString,
  isValidUUID,
  CommonSchemas,
  ExampleSchemas,
} from './validation'

// Error Handling
export {
  createApiError,
  createValidationError,
  createRateLimitError,
  handleUnexpectedError,
  ErrorCodes,
  type ApiErrorResponse,
} from './errors'
