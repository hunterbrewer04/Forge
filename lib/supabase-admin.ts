/**
 * Supabase Admin Client
 *
 * This client uses the SERVICE ROLE KEY which bypasses Row Level Security (RLS).
 *
 * ⚠️  SECURITY WARNING:
 * - NEVER use this client in client-side code
 * - NEVER expose the service role key to the browser
 * - Only use in API routes and server components for admin operations
 * - Always validate user permissions before performing admin operations
 *
 * Use Cases:
 * - Creating profiles during signup (before user auth exists)
 * - Admin operations that need to bypass RLS
 * - Background jobs and cron tasks
 * - Data migrations and bulk operations
 *
 * For regular user operations, use lib/supabase-server.ts instead.
 */

import { createClient } from '@supabase/supabase-js'
import { env } from './env-validation'

/**
 * Creates an admin Supabase client with service role privileges.
 *
 * This client bypasses Row Level Security (RLS) and has full database access.
 *
 * @returns Supabase client with admin privileges
 *
 * @example
 * // In an API route (server-side only!)
 * import { createAdminClient } from '@/lib/supabase-admin'
 *
 * export async function POST(request: Request) {
 *   const supabase = createAdminClient()
 *   // Perform admin operations...
 * }
 */
export function createAdminClient() {
  const serviceRoleKey = env.supabaseServiceRoleKey()

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'This is required for admin operations. ' +
      'Add it to your .env.local file. ' +
      'Get it from: https://app.supabase.com/project/_/settings/api'
    )
  }

  return createClient(
    env.supabaseUrl(),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Type-safe admin client instance.
 * Use createAdminClient() instead for better error handling.
 */
export const supabaseAdmin = createAdminClient()
