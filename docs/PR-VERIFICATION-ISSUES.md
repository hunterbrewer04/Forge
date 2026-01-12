# PR Verification Issues - Calendar & Booking System

**Date:** January 12, 2026  
**Reviewed Commit:** 7309b721f94fa8eadda17fd591b71555a1ced5a3  
**PR Title:** fix: address 22 code review issues for calendar booking system

---

## Executive Summary

The PR claims to have fixed 22 code review issues, but upon verification, **critical fixes are missing from the database layer**. The API layer has validation added, but essential database functions and constraints are not implemented, which will cause **runtime failures and security vulnerabilities**.

---

## Critical Issues

### 🔴 **CRITICAL: Missing Database Function - `get_sessions_availability_batch()`**

**Severity:** CRITICAL  
**Impact:** Runtime failure - application will crash when fetching sessions

**Details:**
- Both `app/api/sessions/route.ts` (line 173) and `lib/services/sessions.ts` (line 113) call `supabase.rpc('get_sessions_availability_batch', { p_session_ids: sessionIds })`
- This function is **not defined** in `docs/migrations/create_sessions_schema.sql`
- Only the single-session version `get_session_availability()` exists (line 259)
- The batch function was supposed to be the core performance optimization (Issues #13, #14)

**Expected Code:**
```sql
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
        s.id,
        COALESCE(s.capacity, 1),
        COUNT(b.id),
        GREATEST(0, COALESCE(s.capacity, 1) - COUNT(b.id)::INTEGER),
        COUNT(b.id) >= COALESCE(s.capacity, 1)
    FROM sessions s
    LEFT JOIN bookings b ON s.id = b.session_id AND b.status = 'confirmed'
    WHERE s.id = ANY(p_session_ids)
    GROUP BY s.id, s.capacity;
END;
$$;
```

**Files Affected:**
- `app/api/sessions/route.ts` (line 173)
- `lib/services/sessions.ts` (line 113)

---

### 🔴 **CRITICAL: RLS Bypass in `book_session()` NOT Fixed**

**Severity:** CRITICAL  
**Impact:** Security vulnerability - any authenticated user can book sessions for other users

**Details:**
- The `book_session()` function in `docs/migrations/create_sessions_schema.sql` (line 302) is still declared as `SECURITY DEFINER`
- **Does NOT validate** that `p_client_id = auth.uid()`
- The code review specifically flagged this as a critical RLS bypass (Issue #1)
- The PR summary claims this was fixed, but **no validation code exists** in the function
- Function bypasses RLS policy `WITH CHECK (client_id = auth.uid())` on `public.bookings`

**Current Problematic Code (lines 302-371):**
```sql
CREATE OR REPLACE FUNCTION book_session(p_session_id UUID, p_client_id UUID)
-- ... no validation of p_client_id = auth.uid()
```

**Required Fix:**
Add validation at the beginning of the function:
```sql
-- Verify the client ID matches the authenticated user
IF p_client_id != auth.uid() THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Unauthorized: cannot book for other users'::TEXT;
    RETURN;
END IF;
```

**File:** `docs/migrations/create_sessions_schema.sql` (lines 302-371)

---

### 🟡 **HIGH: Missing Database Constraints**

**Severity:** HIGH  
**Impact:** Invalid data can be created; booking logic will malfunction

**Details:**
The PR summary claims these constraints were added, but they are **missing from the migration file**:

#### 1. Missing `capacity > 0` Constraint

**Current Code (line 45):**
```sql
capacity INTEGER DEFAULT 1,
```

**Should be:**
```sql
capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
```

**Issue:** Allows zero or negative capacity values, breaking booking logic

---

#### 2. Missing `duration_minutes > 0` Constraint

**Current Code (line 44):**
```sql
duration_minutes INTEGER NOT NULL DEFAULT 60,
```

**Should be:**
```sql
duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
```

**Issue:** Sessions with zero or negative duration should be prevented at DB level

---

#### 3. Missing `ends_at > starts_at` Constraint

**Current Code (lines 48-49):**
```sql
starts_at TIMESTAMPTZ NOT NULL,
ends_at TIMESTAMPTZ NOT NULL,
```

**Should be:**
```sql
starts_at TIMESTAMPTZ NOT NULL,
ends_at TIMESTAMPTZ NOT NULL,
CHECK (ends_at > starts_at),
```

**Issue:** Sessions with invalid time ranges (end before start) can be created

**File:** `docs/migrations/create_sessions_schema.sql` (lines 40-55)

---

## High Priority Issues

### 🟡 **HIGH: Flawed Session Existence Check in `book_session()`**

**Severity:** HIGH  
**Impact:** Function may incorrectly report session as non-existent

**Details:**
Current logic at line 325:
```sql
IF v_capacity IS NULL AND v_session_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session not found'::TEXT;
    RETURN;
END IF;
```

**Problem:** If `v_session_status` has a value but `v_capacity` is NULL, the check incorrectly passes, causing the function to proceed when the session might not exist.

**Correct Logic:**
```sql
IF v_session_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session not found'::TEXT;
    RETURN;
END IF;
```

The `v_session_status` is the definitive indicator of session existence.

**File:** `docs/migrations/create_sessions_schema.sql` (line 325)

---

### 🟡 **HIGH: Capacity=0 Edge Case Not Handled**

**Severity:** HIGH  
**Impact:** Display-only sessions (capacity=0) cannot be created; booking logic treats them as full

**Details:**
- Code review Issue #5 mentions: capacity = 0 means "Session visible but not bookable (display only)"
- Current code at lines 336-340:
```sql
IF v_booked_count >= v_capacity THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session is fully booked'::TEXT;
    RETURN;
END IF;
```

**Problem:** With capacity=0, this condition `v_booked_count >= 0` is always true, blocking all bookings

**Solution:** Add check before capacity comparison:
```sql
-- Allow display-only sessions (capacity = 0)
IF v_capacity > 0 AND v_booked_count >= v_capacity THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Session is fully booked'::TEXT;
    RETURN;
END IF;
```

**File:** `docs/migrations/create_sessions_schema.sql` (lines 336-340)

---

## What Was Actually Implemented ✅

The following items **were successfully implemented:**

### API Layer Validation
- ✅ Date format validation in `POST /api/sessions` (lines 288-313)
- ✅ Date range validation in `PATCH /api/sessions/[id]` (lines 251-273)
- ✅ Capacity reduction validation (lines 275-285)
- ✅ Past session checks in booking endpoint (lines 76-80)
- ✅ Past session prevention for cancellation (lines 208-221)
- ✅ Client-side usage comments added to service files

### API Performance Improvements
- ✅ Map-based O(1) lookups implemented in both API and services
- ✅ Batch query structure for bookings (though function doesn't exist)
- ✅ Batch query structure for availability (though function doesn't exist)

---

## Remediation Checklist

- [ ] **CRITICAL:** Create `get_sessions_availability_batch()` function in migration
- [ ] **CRITICAL:** Add `p_client_id = auth.uid()` validation to `book_session()` function
- [ ] **HIGH:** Add `CHECK (capacity > 0)` constraint to sessions table
- [ ] **HIGH:** Add `CHECK (duration_minutes > 0)` constraint to sessions table
- [ ] **HIGH:** Add `CHECK (ends_at > starts_at)` constraint to sessions table
- [ ] **HIGH:** Fix session existence check to use only `v_session_status IS NULL`
- [ ] **HIGH:** Handle capacity=0 edge case in `book_session()` function
- [ ] Test all changes with database migration
- [ ] Run integration tests to verify no runtime failures
- [ ] Perform security testing for RLS bypass

---

## File References

**Migration Files:**
- `docs/migrations/create_sessions_schema.sql` - Contains database schema and functions

**API Implementation:**
- `app/api/sessions/route.ts` - GET/POST sessions endpoints
- `app/api/sessions/[id]/route.ts` - Session update/delete endpoints
- `app/api/sessions/[id]/book/route.ts` - Session booking endpoint
- `app/api/bookings/[id]/route.ts` - Booking cancellation endpoint

**Service Files:**
- `lib/services/sessions.ts` - Client-side session service
- `lib/services/bookings.ts` - Client-side booking service

---

## Status

**PR Status:** ⚠️ **BLOCKED** - Cannot merge until critical database function and security fixes are implemented.

