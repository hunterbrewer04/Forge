# API Security Utilities (Phase 2)

This directory contains security utilities for building secure Next.js API routes in the Forge application.

## Overview

All API routes should use these utilities to ensure consistent security across the application:

- **Authentication**: Validate user sessions and roles
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Request Validation**: Sanitize and validate input data
- **Error Handling**: Return consistent, safe error responses

## Quick Start

```typescript
import { NextRequest, NextResponse } from 'next/server'
import {
  validateAuth,
  checkRateLimit,
  validateRequestBody,
  handleUnexpectedError,
  RateLimitPresets,
} from '@/lib/api'
import { z } from 'zod'

const RequestSchema = z.object({
  message: z.string().min(1).max(500),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Validate authentication
    const authResult = await validateAuth(request)
    if (authResult instanceof NextResponse) return authResult
    const user = authResult

    // 2. Check rate limit
    const rateLimitResult = await checkRateLimit(
      request,
      RateLimitPresets.GENERAL,
      user.id
    )
    if (rateLimitResult) return rateLimitResult

    // 3. Validate request body
    const validationResult = await validateRequestBody(request, RequestSchema)
    if (validationResult instanceof NextResponse) return validationResult
    const { message } = validationResult

    // 4. Process request safely
    // Use validated user.id and sanitized message

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'POST /api/your-route')
  }
}
```

## Modules

### Authentication (`auth.ts`)

Validates user authentication and authorization.

**Functions:**
- `validateAuth(request)` - Validates user is authenticated
- `validateRole(request, role)` - Validates user has specific role

**Example:**
```typescript
const authResult = await validateAuth(request)
if (authResult instanceof NextResponse) {
  return authResult // User not authenticated
}
const user = authResult // User object
```

### Rate Limiting (`rate-limit.ts`)

Prevents API abuse with configurable rate limits.

**Functions:**
- `checkRateLimit(request, config, userId?)` - Check if request should be rate limited
- `withRateLimit(handler, config)` - Wrapper for route handlers
- `getRateLimitStatus(request, config, userId?)` - Get current rate limit status

**Presets:**
- `RateLimitPresets.GENERAL` - 60 requests/minute
- `RateLimitPresets.AUTH` - 5 requests/minute (for login/signup)
- `RateLimitPresets.MESSAGING` - 30 requests/minute
- `RateLimitPresets.UPLOAD` - 10 requests/minute
- `RateLimitPresets.STRICT` - 3 requests/minute (for sensitive operations)

**Example:**
```typescript
const rateLimitResult = await checkRateLimit(
  request,
  RateLimitPresets.MESSAGING,
  user.id
)
if (rateLimitResult) {
  return rateLimitResult // Rate limit exceeded
}
```

### Request Validation (`validation.ts`)

Validates and sanitizes request data using Zod schemas.

**Functions:**
- `validateRequestBody(request, schema)` - Validate POST/PUT/PATCH body
- `validateQueryParams(request, schema)` - Validate GET query parameters
- `sanitizeString(input)` - Sanitize string to prevent XSS
- `isValidUUID(value)` - Check if string is valid UUID

**Common Schemas:**
- `CommonSchemas.uuid` - UUID validation
- `CommonSchemas.email` - Email validation
- `CommonSchemas.nonEmptyString` - Non-empty string
- `CommonSchemas.positiveInt` - Positive integer
- `CommonSchemas.paginationLimit` - Pagination limit (1-100)
- `CommonSchemas.paginationOffset` - Pagination offset (0+)

**Example:**
```typescript
const schema = z.object({
  email: z.string().email(),
  message: z.string().min(1).max(500),
})

const result = await validateRequestBody(request, schema)
if (result instanceof NextResponse) {
  return result // Validation failed
}
const { email, message } = result
```

### Error Handling (`errors.ts`)

Creates consistent, safe error responses.

**Functions:**
- `createApiError(message, status, code?, details?)` - Generic error
- `createValidationError(fields, message?)` - Validation error (400)
- `createRateLimitError(retryAfterSeconds)` - Rate limit error (429)
- `handleUnexpectedError(error, context)` - Safe handling of unexpected errors

**Error Codes:**
```typescript
ErrorCodes.AUTHENTICATION_FAILED // 401
ErrorCodes.NO_SESSION // 401
ErrorCodes.INSUFFICIENT_PERMISSIONS // 403
ErrorCodes.VALIDATION_ERROR // 400
ErrorCodes.RATE_LIMIT_EXCEEDED // 429
ErrorCodes.INTERNAL_ERROR // 500
```

**Example:**
```typescript
return createApiError(
  'User not found',
  404,
  'USER_NOT_FOUND'
)
```

## Best Practices

### 1. Always Validate Authentication First
```typescript
const authResult = await validateAuth(request)
if (authResult instanceof NextResponse) return authResult
```

### 2. Apply Rate Limiting to All Endpoints
```typescript
const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, user.id)
if (rateLimitResult) return rateLimitResult
```

### 3. Validate All Input Data
```typescript
const result = await validateRequestBody(request, schema)
if (result instanceof NextResponse) return result
```

### 4. Never Trust Client-Provided User IDs
```typescript
// ❌ BAD - Don't trust client
const { userId } = await request.json()

// ✅ GOOD - Use validated user from auth
const authResult = await validateAuth(request)
const user = authResult
// Use user.id in queries
```

### 5. Use Proper Supabase Clients
```typescript
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// For user-scoped operations (most cases)
const supabase = createServerClient()

// For admin operations ONLY (bypasses RLS)
const adminSupabase = createAdminClient()
```

### 6. Handle Errors Safely
```typescript
try {
  // Your logic
} catch (error) {
  return handleUnexpectedError(error, 'POST /api/route')
}
```

### 7. Never Expose Internal Details
```typescript
// ❌ BAD
return NextResponse.json({ error: error.stack }, { status: 500 })

// ✅ GOOD
return createApiError('An error occurred', 500, 'INTERNAL_ERROR')
```

## Security Checklist for New API Routes

When creating a new API route, ensure:

- [ ] Authentication is validated at the start
- [ ] Rate limiting is applied
- [ ] Request body/query params are validated with Zod schemas
- [ ] User IDs come from validated auth (not client input)
- [ ] Errors are handled safely without leaking details
- [ ] Proper Supabase client is used (server vs admin)
- [ ] Try-catch wraps the entire handler
- [ ] Console.log statements don't expose sensitive data
- [ ] Error responses use standardized format
- [ ] Success responses follow consistent structure

## Testing Your API Routes

### Manual Testing with curl

```bash
# Test authentication
curl -X GET http://localhost:3000/api/example \
  -H "Cookie: your-session-cookie"

# Test rate limiting (run multiple times)
for i in {1..70}; do
  curl -X GET http://localhost:3000/api/example
done

# Test validation
curl -X POST http://localhost:3000/api/example \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'  # Should fail validation
```

### Testing with Postman/Insomnia

1. **Authentication**: Copy session cookies from browser dev tools
2. **Rate Limiting**: Send requests in quick succession
3. **Validation**: Try invalid data formats
4. **Error Handling**: Send malformed JSON

## Example API Routes

See `/app/api/example/route.ts` for a comprehensive reference implementation.

## Phase 1 Integration

These utilities build on Phase 1 security:

- Uses `env` helper from `@/lib/env-validation`
- Works with Supabase clients from Phase 1:
  - `@/lib/supabase-server` for server operations
  - `@/lib/supabase-admin` for admin operations
- Leverages RLS policies established in Phase 1

## Rate Limiting Notes

**Current Implementation:**
- In-memory storage (resets on serverless cold starts)
- Suitable for basic protection
- Works well with Vercel's architecture

**For Higher Traffic:**
Consider upgrading to:
- Vercel KV + @upstash/ratelimit
- Redis-based solution
- Distributed rate limiting

## Future Enhancements

Planned for future phases:

- CORS configuration helpers
- Request logging utilities
- API metrics collection
- Response caching utilities
- Webhook signature verification
- File upload validation helpers

## Support

For questions or issues:
1. Check the example route: `/app/api/example/route.ts`
2. Review Phase 2 documentation: `SECURITY-PHASE2-REPORT.md`
3. Consult Phase 1 report: `SECURITY-PHASE1-REPORT.md`
