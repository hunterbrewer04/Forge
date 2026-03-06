-- Migration: add_clerk_user_id_to_profiles
-- Adds Clerk user ID as a lookup key on profiles.
-- profiles.id (UUID) stays as the PK — all FK references unchanged.
-- clerk_user_id is nullable until existing users are migrated.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- Unique constraint + index for fast lookups by Clerk ID
CREATE UNIQUE INDEX IF NOT EXISTS profiles_clerk_user_id_key
  ON profiles(clerk_user_id);
