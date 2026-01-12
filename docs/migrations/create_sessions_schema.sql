-- ============================================================================
-- Sessions & Bookings Schema Migration
-- ============================================================================
-- This migration creates the tables for the calendar booking system:
-- - session_types: Categories for filtering sessions
-- - sessions: Scheduled classes and appointments
-- - bookings: Client reservations for sessions
--
-- Run this migration in the Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
-- ============================================================================

-- ============================================================================
-- Session Types Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#ff6714',
    icon VARCHAR(50) DEFAULT 'fitness_center',
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.session_types IS 'Categories for filtering and styling sessions';
COMMENT ON COLUMN public.session_types.slug IS 'URL-safe identifier for filtering';
COMMENT ON COLUMN public.session_types.color IS 'Hex color code for UI styling';
COMMENT ON COLUMN public.session_types.icon IS 'Material icon name for UI';
COMMENT ON COLUMN public.session_types.is_premium IS 'Whether to show premium badge styling';

-- ============================================================================
-- Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_type_id UUID REFERENCES public.session_types(id) ON DELETE SET NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    capacity INTEGER DEFAULT 1 CHECK (capacity >= 0),
    is_premium BOOLEAN DEFAULT false,
    location VARCHAR(200),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    CONSTRAINT valid_time_range CHECK (ends_at > starts_at),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.sessions IS 'Scheduled classes and appointments';
COMMENT ON COLUMN public.sessions.trainer_id IS 'The trainer who created and manages this session';
COMMENT ON COLUMN public.sessions.capacity IS 'Max attendees. NULL or 1 = 1-on-1 session';
COMMENT ON COLUMN public.sessions.status IS 'scheduled, cancelled, or completed';
COMMENT ON COLUMN public.sessions.starts_at IS 'Start date/time in UTC';
COMMENT ON COLUMN public.sessions.ends_at IS 'End date/time in UTC';

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_id ON public.sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_type_id ON public.sessions(session_type_id);
CREATE INDEX IF NOT EXISTS idx_sessions_starts_at ON public.sessions(starts_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_date ON public.sessions(trainer_id, starts_at);

-- ============================================================================
-- Bookings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
    booked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(session_id, client_id)
);

COMMENT ON TABLE public.bookings IS 'Client reservations for sessions';
COMMENT ON COLUMN public.bookings.status IS 'confirmed, cancelled, attended, or no_show';
COMMENT ON COLUMN public.bookings.booked_at IS 'When the booking was made';

-- Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON public.bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON public.bookings(client_id, status);

-- ============================================================================
-- Row Level Security (RLS) Policies - Session Types
-- ============================================================================

ALTER TABLE public.session_types ENABLE ROW LEVEL SECURITY;

-- Anyone can read session types
CREATE POLICY "Anyone can read session types"
    ON public.session_types
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can manage session types
CREATE POLICY "Admins can insert session types"
    ON public.session_types
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update session types"
    ON public.session_types
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can delete session types"
    ON public.session_types
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- Row Level Security (RLS) Policies - Sessions
-- ============================================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can read scheduled sessions; trainers can also read their own sessions in any status
CREATE POLICY "Anyone can read scheduled sessions"
    ON public.sessions
    FOR SELECT
    TO authenticated
    USING (status = 'scheduled' OR trainer_id = auth.uid());

-- Trainers can create sessions (they become the trainer_id)
CREATE POLICY "Trainers can create sessions"
    ON public.sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        trainer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_trainer = true OR profiles.is_admin = true)
        )
    );

-- Trainers can update their own sessions
CREATE POLICY "Trainers can update own sessions"
    ON public.sessions
    FOR UPDATE
    TO authenticated
    USING (
        trainer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Trainers can delete their own sessions
CREATE POLICY "Trainers can delete own sessions"
    ON public.sessions
    FOR DELETE
    TO authenticated
    USING (
        trainer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- Row Level Security (RLS) Policies - Bookings
-- ============================================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Clients can read their own bookings
CREATE POLICY "Clients can read own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = bookings.session_id
            AND sessions.trainer_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Clients can create bookings for themselves
CREATE POLICY "Clients can create bookings"
    ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid());

-- Clients can update (cancel) their own bookings
CREATE POLICY "Clients can update own bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (
        client_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = bookings.session_id
            AND sessions.trainer_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- Database Functions
-- ============================================================================

-- Function to get session availability
CREATE OR REPLACE FUNCTION get_session_availability(p_session_id UUID)
RETURNS TABLE (
    capacity INTEGER,
    booked_count BIGINT,
    spots_left INTEGER,
    is_full BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_capacity INTEGER;
    v_booked_count BIGINT;
BEGIN
    -- Get session capacity
    SELECT s.capacity INTO v_capacity
    FROM public.sessions s
    WHERE s.id = p_session_id;

    IF v_capacity IS NULL THEN
        v_capacity := 1; -- Default to 1 for 1-on-1 sessions
    END IF;

    -- Count confirmed bookings
    SELECT COUNT(*) INTO v_booked_count
    FROM public.bookings b
    WHERE b.session_id = p_session_id
    AND b.status = 'confirmed';

    RETURN QUERY SELECT
        v_capacity,
        v_booked_count,
        GREATEST(0, v_capacity - v_booked_count::INTEGER)::INTEGER,
        v_booked_count >= v_capacity;
END;
$$;

COMMENT ON FUNCTION get_session_availability IS 'Returns capacity, booked count, spots left, and is_full status for a session';

-- Set search_path for security
ALTER FUNCTION public.get_session_availability(UUID) SET search_path = public;

-- Batch function for fetching availability of multiple sessions (performance optimization)
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

-- Function to book a session atomically
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
    -- Verify the client ID matches the authenticated user (RLS bypass prevention)
    IF p_client_id != auth.uid() THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Unauthorized: cannot book for other users'::TEXT;
        RETURN;
    END IF;

    -- Lock the session row to prevent race conditions
    SELECT s.capacity, s.status INTO v_capacity, v_session_status
    FROM public.sessions s
    WHERE s.id = p_session_id
    FOR UPDATE;

    -- Check if session exists (v_session_status is the definitive indicator)
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

    -- Check if session is display-only (capacity = 0)
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

COMMENT ON FUNCTION book_session IS 'Atomically books a session with capacity check. Prevents race conditions and duplicate bookings.';

-- Set search_path for security
ALTER FUNCTION public.book_session(UUID, UUID) SET search_path = public;

-- ============================================================================
-- Trigger for updated_at timestamps
-- ============================================================================

-- Create a generic function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Set search_path for security
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Apply trigger to session_types
DROP TRIGGER IF EXISTS update_session_types_updated_at ON public.session_types;
CREATE TRIGGER update_session_types_updated_at
    BEFORE UPDATE ON public.session_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to sessions
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data - Default Session Types
-- ============================================================================

INSERT INTO public.session_types (name, slug, color, icon, is_premium) VALUES
    ('Strength', 'strength', '#ff6714', 'fitness_center', false),
    ('Cardio', 'cardio', '#10b981', 'directions_run', false),
    ('HIIT', 'hiit', '#ef4444', 'local_fire_department', false),
    ('Recovery', 'recovery', '#6366f1', 'self_improvement', false),
    ('1-on-1', 'one-on-one', '#f59e0b', 'person', true),
    ('Group Class', 'group', '#8b5cf6', 'groups', false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Sample Usage
-- ============================================================================
--
-- Book a session:
-- SELECT * FROM book_session('session-uuid', 'client-uuid');
--
-- Check availability:
-- SELECT * FROM get_session_availability('session-uuid');
--
-- Get sessions for a date:
-- SELECT * FROM sessions WHERE starts_at::date = '2025-01-15' AND status = 'scheduled';
--
-- Get client's bookings:
-- SELECT b.*, s.title, s.starts_at
-- FROM bookings b
-- JOIN sessions s ON b.session_id = s.id
-- WHERE b.client_id = 'user-uuid' AND b.status = 'confirmed';
-- ============================================================================
