/**
 * Supabase Admin Client — Storage Only
 *
 * All database operations now use Drizzle ORM (lib/db/index.ts).
 * This client exists solely for Supabase Storage uploads (chat media, avatars).
 * It will be removed when Storage migrates to Cloudflare R2 in Phase 4.
 *
 * Only used by: app/api/upload/route.ts
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from './env-validation'

export function createAdminClient() {
  const serviceRoleKey = env.supabaseServiceRoleKey()

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Required for Supabase Storage operations. ' +
      'Add it to your .env.local file.'
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
