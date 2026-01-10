/**
 * Audit Logging Service
 *
 * Provides audit logging capabilities for tracking security-sensitive
 * operations and user actions in the application.
 *
 * IMPORTANT: Requires the audit_logs table to exist in Supabase.
 * Run the migration in docs/migrations/create_audit_logs.sql
 */

import { createAdminClient } from '@/lib/supabase-admin'
import { headers } from 'next/headers'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'SIGNUP'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'PROFILE_UPDATE'
  | 'MESSAGE_SEND'
  | 'MESSAGE_DELETE'
  | 'MEDIA_UPLOAD'
  | 'MEDIA_DELETE'
  | 'CONVERSATION_CREATE'
  | 'CONVERSATION_DELETE'
  | 'SESSION_CREATE'
  | 'SESSION_UPDATE'
  | 'SESSION_CANCEL'
  | 'SESSION_DELETE'
  | 'BOOKING_CREATE'
  | 'BOOKING_CANCEL'
  | 'ADMIN_ACTION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SECURITY_ALERT'

export type AuditResource =
  | 'auth'
  | 'profile'
  | 'message'
  | 'media'
  | 'conversation'
  | 'session'
  | 'booking'
  | 'system'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogRecord {
  id: string
  user_id: string
  action: string
  resource: string
  resource_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts client IP address from request headers
 */
async function getClientIp(): Promise<string | null> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    return forwarded?.split(',')[0].trim() || realIp || null
  } catch {
    // headers() may throw if not in a request context
    return null
  }
}

/**
 * Extracts user agent from request headers
 */
async function getUserAgent(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('user-agent')
  } catch {
    return null
  }
}

/**
 * Sanitizes metadata to prevent sensitive data leakage
 */
function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!metadata) return null

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization']
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

// ============================================================================
// Main Audit Logging Function
// ============================================================================

/**
 * Logs an audit event to the database
 *
 * @param entry - The audit log entry to record
 * @returns Promise<boolean> - True if logged successfully, false otherwise
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   userId: user.id,
 *   action: 'LOGIN',
 *   resource: 'auth',
 *   metadata: { method: 'email' }
 * })
 * ```
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const supabase = createAdminClient()

    const ipAddress = entry.ipAddress || await getClientIp()
    const userAgent = entry.userAgent || await getUserAgent()
    const sanitizedMetadata = sanitizeMetadata(entry.metadata)

    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId || null,
      metadata: sanitizedMetadata,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    })

    if (error) {
      // Log error but don't throw - audit logging should never break the app
      console.error('Failed to write audit log:', error.message)
      return false
    }

    return true
  } catch (error) {
    // Catch any errors (including missing table) gracefully
    console.error('Audit logging error:', error)
    return false
  }
}

/**
 * Logs an audit event with request context extracted automatically
 *
 * @param entry - Partial audit entry (IP and user agent extracted from headers)
 */
export async function logAuditEventFromRequest(
  entry: Omit<AuditLogEntry, 'ipAddress' | 'userAgent'>
): Promise<boolean> {
  return logAuditEvent({
    ...entry,
    ipAddress: (await getClientIp()) || undefined,
    userAgent: (await getUserAgent()) || undefined,
  })
}

// ============================================================================
// Convenience Logging Functions
// ============================================================================

/**
 * Log a successful authentication event
 */
export async function logAuthSuccess(
  userId: string,
  method: 'email' | 'oauth' | 'magic_link' = 'email'
): Promise<boolean> {
  return logAuditEventFromRequest({
    userId,
    action: 'LOGIN',
    resource: 'auth',
    metadata: { method },
  })
}

/**
 * Log a logout event
 */
export async function logLogout(userId: string): Promise<boolean> {
  return logAuditEventFromRequest({
    userId,
    action: 'LOGOUT',
    resource: 'auth',
  })
}

/**
 * Log a new user signup
 */
export async function logSignup(userId: string, email: string): Promise<boolean> {
  return logAuditEventFromRequest({
    userId,
    action: 'SIGNUP',
    resource: 'auth',
    metadata: { email },
  })
}

/**
 * Log a security alert (e.g., suspicious activity)
 */
export async function logSecurityAlert(
  userId: string,
  alertType: string,
  details?: Record<string, unknown>
): Promise<boolean> {
  return logAuditEventFromRequest({
    userId,
    action: 'SECURITY_ALERT',
    resource: 'system',
    metadata: { alertType, ...details },
  })
}

/**
 * Log a rate limit exceeded event
 */
export async function logRateLimitExceeded(
  userId: string,
  endpoint: string
): Promise<boolean> {
  return logAuditEventFromRequest({
    userId,
    action: 'RATE_LIMIT_EXCEEDED',
    resource: 'system',
    metadata: { endpoint },
  })
}

// ============================================================================
// Audit Log Query Functions (for admin use)
// ============================================================================

/**
 * Query audit logs for a specific user
 *
 * @param userId - The user ID to query logs for
 * @param limit - Maximum number of records to return (default 100)
 */
export async function getAuditLogsForUser(
  userId: string,
  limit = 100
): Promise<AuditLogRecord[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to query audit logs:', error.message)
      return []
    }

    return data as AuditLogRecord[]
  } catch (error) {
    console.error('Audit log query error:', error)
    return []
  }
}

/**
 * Query recent audit logs by action type
 *
 * @param action - The action type to filter by
 * @param limit - Maximum number of records to return (default 100)
 */
export async function getAuditLogsByAction(
  action: AuditAction,
  limit = 100
): Promise<AuditLogRecord[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to query audit logs:', error.message)
      return []
    }

    return data as AuditLogRecord[]
  } catch (error) {
    console.error('Audit log query error:', error)
    return []
  }
}
