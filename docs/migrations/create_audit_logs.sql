-- ============================================================================
-- Audit Logs Table Migration
-- ============================================================================
-- This migration creates the audit_logs table for tracking security-sensitive
-- operations and user actions in the application.
--
-- Run this migration in the Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
-- ============================================================================

-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE public.audit_logs IS 'Stores audit trail of security-sensitive user actions';

-- Add column comments
COMMENT ON COLUMN public.audit_logs.user_id IS 'The user who performed the action';
COMMENT ON COLUMN public.audit_logs.action IS 'Type of action (LOGIN, LOGOUT, SIGNUP, etc.)';
COMMENT ON COLUMN public.audit_logs.resource IS 'Resource type affected (auth, profile, message, etc.)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'Optional ID of the specific resource affected';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context about the action';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Client IP address';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Client user agent string';

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource);

-- Create a composite index for user + time queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
    ON public.audit_logs(user_id, created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert (via admin client)
-- Regular users cannot directly insert audit logs
CREATE POLICY "Service role can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Users can read their own audit logs
CREATE POLICY "Users can read own audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Admins can read all audit logs (requires is_admin flag on profiles)
CREATE POLICY "Admins can read all audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- Automatic Cleanup Function (Optional)
-- ============================================================================
-- This function can be used with pg_cron to automatically cleanup old logs

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than specified days (default 90)';

-- ============================================================================
-- Sample Usage
-- ============================================================================
--
-- To manually cleanup logs older than 30 days:
-- SELECT cleanup_old_audit_logs(30);
--
-- To setup automatic cleanup with pg_cron (if available):
-- SELECT cron.schedule('cleanup-audit-logs', '0 3 * * *',
--     $$SELECT cleanup_old_audit_logs(90)$$);
-- ============================================================================
