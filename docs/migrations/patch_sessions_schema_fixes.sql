-- ============================================================================
-- PATCH: Sessions Schema Fixes
-- ============================================================================
-- This patch applies the fixes identified in PR verification for the
-- calendar booking system. Run this in the Supabase SQL Editor.
--
-- Date: January 12, 2026
-- Fixes: 7 issues (2 critical, 5 high priority)
-- ============================================================================

-- ============================================================================
-- Step 1: Add Missing Constraints to Sessions Table
-- ============================================================================
-- These constraints ensure data integrity at the database level.
-- Note: If any existing data violates these constraints, the ALTER will fail.
-- You may need to clean up invalid data first.

-- Add duration_minutes > 0 constraint
ALTER TABLE public.sessions
  ADD CONSTRAINT check_duration_positive CHECK (duration_minutes > 0);

-- Add capacity >= 0 constraint (allows 0 for display-only sessions)
ALTER TABLE public.sessions
  ADD CONSTRAINT check_capacity_non_negative CHECK (capacity >= 0);

-- Add ends_at > starts_at constraint
ALTER TABLE public.sessions
  ADD CONSTRAINT valid_time_range CHECK (ends_at > starts_at);

-- ============================================================================
-- Step 2: Create Batch Availability Function (CRITICAL)
-- ============================================================================
-- This function is called by the API but was missing from the original migration.
-- Without it, fetching sessions will fail at runtime.

CREATE OR REPLACE FUNCTION get_sessions_availability_batch(p_session_ids UUID[])
RETURNS TABLE (
    session_id UUID,
    capacity INTEGER,
    booked_count BIGINT,
    spots_left INTEGER,
    is_full BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS session_id,
        COALESCE(s.capacity, 1)::INTEGER AS capacity,
        COUNT(b.id) AS booked_count,
        GREATEST(0, COALESCE(s.capacity, 1) - COUNT(b.id)::INTEGER)::INTEGER AS spots_left,
        COUNT(b.id) >= COALESCE(s.capacity, 1) AS is_full
    FROM public.sessions s
    LEFT JOIN public.bookings b ON s.id = b.session_id AND b.status = 'confirmed'
    WHERE s.id = ANY(p_session_ids)
    GROUP BY s.id, s.capacity;
END;
$$;

COMMENT ON FUNCTION get_sessions_availability_batch IS 'Batch version of get_session_availability for fetching multiple sessions at once';

-- Set search_path for security
ALTER FUNCTION public.get_sessions_availability_batch(UUID[]) SET search_path = public;

-- ============================================================================
-- Step 3: Replace book_session Function (CRITICAL SECURITY FIX)
-- ============================================================================
-- This replaces the existing function with fixes for:
-- - RLS bypass vulnerability (added auth.uid() validation)
-- - Flawed session existence check
-- - Capacity=0 edge case handling

CREATE OR REPLACE FUNCTION book_session(p_session_id UUID, p_client_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    booking_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_capacity INTEGER;
    v_booked_count BIGINT;
    v_session_status VARCHAR(20);
    v_existing_booking UUID;
    v_new_booking_id UUID;
BEGIN
    -- SECURITY FIX: Verify the client ID matches the authenticated user
    -- This prevents users from booking sessions for other users
    IF p_client_id != auth.uid() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Unauthorized: cannot book for other users'::TEXT;
        RETURN;
    END IF;

    -- Lock the session row to prevent race conditions
    SELECT s.capacity, s.status INTO v_capacity, v_session_status
    FROM public.sessions s
    WHERE s.id = p_session_id
    FOR UPDATE;

    -- FIX: Check if session exists using only v_session_status
    -- (Previously checked both v_capacity AND v_session_status which was flawed)
    IF v_session_status IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Session not found'::TEXT;
        RETURN;
    END IF;

    -- Check if session is still scheduled
    IF v_session_status != 'scheduled' THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Session is not available for booking'::TEXT;
        RETURN;
    END IF;

    -- Default capacity to 1 for 1-on-1 sessions
    IF v_capacity IS NULL THEN
        v_capacity := 1;
    END IF;

    -- Check for existing booking
    SELECT b.id INTO v_existing_booking
    FROM public.bookings b
    WHERE b.session_id = p_session_id
    AND b.client_id = p_client_id
    AND b.status = 'confirmed';

    IF v_existing_booking IS NOT NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'You have already booked this session'::TEXT;
        RETURN;
    END IF;

    -- Count current confirmed bookings
    SELECT COUNT(*) INTO v_booked_count
    FROM public.bookings b
    WHERE b.session_id = p_session_id
    AND b.status = 'confirmed';

    -- FIX: Handle display-only sessions (capacity = 0)
    IF v_capacity = 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, 'This session is display-only and not bookable'::TEXT;
        RETURN;
    END IF;

    -- Check capacity
    IF v_booked_count >= v_capacity THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Session is fully booked'::TEXT;
        RETURN;
    END IF;

    -- Create the booking
    INSERT INTO public.bookings (session_id, client_id, status, booked_at)
    VALUES (p_session_id, p_client_id, 'confirmed', NOW())
    RETURNING id INTO v_new_booking_id;

    RETURN QUERY SELECT true, v_new_booking_id, NULL::TEXT;
END;
$$;

COMMENT ON FUNCTION book_session IS 'Atomically books a session with capacity check. Prevents race conditions, duplicate bookings, and unauthorized bookings.';

-- Set search_path for security
ALTER FUNCTION public.book_session(UUID, UUID) SET search_path = public;

-- ============================================================================
-- Verification Queries (Optional - Run these to confirm the patch worked)
-- ============================================================================
--
-- 1. Check constraints were added:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'public.sessions'::regclass;
--
-- 2. Check batch function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'get_sessions_availability_batch';
--
-- 3. Test batch function (replace with real session IDs):
-- SELECT * FROM get_sessions_availability_batch(ARRAY['00000000-0000-0000-0000-000000000000']::UUID[]);
--
-- ============================================================================
