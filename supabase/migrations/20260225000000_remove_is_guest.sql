DROP INDEX IF EXISTS idx_profiles_guest_email;
ALTER TABLE profiles DROP COLUMN IF EXISTS is_guest;
