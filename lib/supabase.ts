/**
 * Legacy Supabase Client
 *
 * ⚠️  DEPRECATED: This file is kept for backwards compatibility.
 *
 * Please use the appropriate client for your use case:
 * - Client components: import { createClient } from '@/lib/supabase-browser'
 * - Server components/API routes: import { createClient } from '@/lib/supabase-server'
 * - Admin operations: import { createAdminClient } from '@/lib/supabase-admin'
 *
 * This legacy client should only be used for:
 * - Existing code that hasn't been migrated yet
 * - Simple, non-auth-dependent operations
 */

import { createClient } from '@supabase/supabase-js'
import { env } from './env-validation'

const supabaseUrl = env.supabaseUrl()
const supabaseAnonKey = env.supabaseAnonKey()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
