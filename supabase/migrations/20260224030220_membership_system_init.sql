-- Migration: membership_system_init
-- Renames is_client -> has_full_access, adds membership columns, creates membership_tiers table

-- Step 1: Rename is_client to has_full_access
ALTER TABLE profiles RENAME COLUMN is_client TO has_full_access;

-- Step 2: Add membership columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS membership_tier_id uuid,
  ADD COLUMN IF NOT EXISTS membership_status text;

-- Step 3: Create membership_tiers table
CREATE TABLE IF NOT EXISTS membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  monthly_booking_quota integer NOT NULL,
  price_monthly numeric(10,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Add FK constraint from profiles.membership_tier_id -> membership_tiers.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_membership_tier_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_membership_tier_id_fkey
      FOREIGN KEY (membership_tier_id) REFERENCES membership_tiers(id);
  END IF;
END $$;

-- Step 5: Seed starter tier (only if not already present)
INSERT INTO membership_tiers (name, slug, stripe_price_id, monthly_booking_quota, price_monthly)
SELECT 'Starter', 'starter', 'price_PLACEHOLDER', 8, 49.00
WHERE NOT EXISTS (SELECT 1 FROM membership_tiers WHERE slug = 'starter');
