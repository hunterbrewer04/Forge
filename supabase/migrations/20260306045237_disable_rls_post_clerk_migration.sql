-- Migration: disable_rls_post_clerk_migration
-- RLS policies relied on auth.uid() from Supabase Auth.
-- Security is now enforced at the API layer via Clerk JWT.
-- The service role client bypasses RLS anyway — disabling makes the
-- security model explicit and removes misleading policy definitions.

-- Disable RLS on all application tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'Disabled RLS on %', tbl.tablename;
  END LOOP;
END $$;

-- Drop all existing RLS policies in the public schema
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;
