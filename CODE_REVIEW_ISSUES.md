# Code Review Issues - Calendar & Booking System Integration

This document provides a complete overview of all issues identified in the code review that need to be addressed.

---

## Critical Security Issues

### 1. **SECURITY DEFINER Function Allows Cross-Tenant Data Modification**
**File:** `docs/migrations/create_sessions_schema.sql:302-371`  
**Severity:** CRITICAL

**Issue:**  
The `book_session()` function is declared as `SECURITY DEFINER` but never verifies that `p_client_id` matches `auth.uid()`. This allows any caller with EXECUTE privileges to create bookings for arbitrary users, bypassing the RLS policy `WITH CHECK (client_id = auth.uid())` on `public.bookings`.

**Impact:**  
Attackers can create bookings on behalf of other users, modifying other tenants' data without authorization.

**Recommendation:**
- Remove `SECURITY DEFINER` or
- Strictly enforce `p_client_id = auth.uid()` inside the function
- Consider forcing RLS to apply within the function

---

## High Priority Issues

### 2. **Client-Side Supabase Client Used in Service Layer**
**Files:**
- `lib/services/bookings.ts:1`
- `lib/services/sessions.ts:1`

**Issue:**  
Service functions use `createClient` from `@/lib/supabase-browser`, which is intended for client-side use. These services might be called from server components or API routes where a server-side client should be used instead.

**Recommendation:**  
Determine if these services are client-side only or refactor to use the appropriate server-side client when called from API routes/server components.

---

### 3. **N+2 Query Performance Problem**
**Files:**
- `lib/services/sessions.ts:104-147`
- `app/api/sessions/route.ts:128-168`

**Issue:**  
The `fetchSessions` function and GET `/api/sessions` endpoint fetch availability and user bookings inside a `Promise.all` map, creating N+2 queries for N sessions (one for availability, one for booking check per session).

**Impact:**  
This will cause severe performance issues with many sessions.

**Recommendation:**  
Use a single query with joins or batch processing to reduce database round trips.

---

### 4. **Missing Session Start Time Validation on Booking**
**File:** `app/api/sessions/[id]/book/route.ts:79-86`

**Issue:**  
The booking endpoint doesn't check if the session has already passed (`starts_at` is in the past). Users can book sessions that have already started or completed.

**Recommendation:**  
Add validation to prevent booking past sessions:
```typescript
if (new Date(session.starts_at) < new Date()) {
  return createApiError(
    'Cannot book a session that has already started or passed',
    400,
    'SESSION_ALREADY_STARTED'
  )
}
```

---

### 5. **Missing Business Rules for Booking Cancellation**
**File:** `app/api/bookings/[id]/route.ts:233-242`

**Issue:**  
The booking cancellation endpoint doesn't check if the session has already passed or started. There are no business rules about when bookings can be cancelled (e.g., not within 24 hours of the session start time).

**Recommendation:**  
Add validation for cancellation window:
```typescript
const session = await supabase
  .from('sessions')
  .select('starts_at')
  .eq('id', booking.session_id)
  .single()

if (new Date(session.starts_at) < new Date()) {
  return createApiError(
    'Cannot cancel a booking for a session that has already started',
    400,
    'SESSION_ALREADY_STARTED'
  )
}
```

---

### 6. **Capacity Reduction Without Validation**
**File:** `app/api/sessions/[id]/route.ts:231`

**Issue:**  
When reducing capacity on an existing session, there's no validation to check if the new capacity is less than the current number of confirmed bookings. This could result in a session with capacity of 5 but 10 confirmed bookings.

**Recommendation:**  
```typescript
if (body.capacity !== undefined) {
  const confirmedBookingsCount =
    (existingSession as { confirmed_bookings_count?: number }).confirmed_bookings_count ?? 0
  if (body.capacity < confirmedBookingsCount) {
    return createApiError(
      'Cannot reduce capacity below the number of confirmed bookings',
      400,
      'INVALID_CAPACITY'
    )
  }
  updateData.capacity = body.capacity
}
```

---

## Medium Priority Issues

### 7. **Missing Date Range Validation on Session Creation**
**File:** `app/api/sessions/route.ts:236`

**Issue:**  
The POST `/api/sessions` endpoint doesn't validate that `starts_at` and `ends_at` are valid ISO date strings or that `ends_at` is after `starts_at`.

**Recommendation:**  
```typescript
// Validate date formats and range
const startsAt = new Date(body.starts_at)
const endsAt = new Date(body.ends_at)

if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
  return createApiError(
    'Invalid date format: starts_at and ends_at must be valid ISO date strings',
    400,
    'VALIDATION_ERROR'
  )
}

if (endsAt <= startsAt) {
  return createApiError(
    'Invalid time range: ends_at must be after starts_at',
    400,
    'VALIDATION_ERROR'
  )
}
```

---

### 8. **Missing Date Range Validation on Session Update**
**File:** `app/api/sessions/[id]/route.ts:234-235`

**Issue:**  
The PATCH endpoint doesn't validate the date range when `starts_at` or `ends_at` is updated. If only one field is updated, the session could end up with `ends_at` before `starts_at`.

**Recommendation:**  
Validate the date range after applying updates:
```typescript
const finalStartsAt = body.starts_at ?? existingSession.starts_at
const finalEndsAt = body.ends_at ?? existingSession.ends_at

if (new Date(finalEndsAt) <= new Date(finalStartsAt)) {
  return createApiError(
    'Invalid time range: ends_at must be after starts_at',
    400,
    'VALIDATION_ERROR'
  )
}
```

---

### 9. **Inefficient Session Type Filtering**
**File:** `app/api/sessions/route.ts:117-126`

**Issue:**  
Session type filtering is done in memory after fetching from the database. For better performance, the session type should be resolved first and then used in the database query with `eq('session_type_id', sessionType.id)`.

**Recommendation:**  
Resolve session type first, then filter at database level:
```typescript
if (type) {
  const { data: sessionType } = await supabase
    .from('session_types')
    .select('id')
    .eq('name', type)
    .single()
  
  if (sessionType) {
    query = query.eq('session_type_id', sessionType.id)
  }
}
```

---

### 10. **Inconsistent NULL Capacity Handling**
**Files:**
- `app/api/sessions/route.ts:261`
- `lib/services/sessions.ts:242`
- `docs/migrations/create_sessions_schema.sql:59`
- `Calender-integration.md:74`

**Issue:**  
Multiple inconsistencies in how NULL capacity is handled:
- API uses `capacity ?? 1` (treating NULL as 1)
- Documentation says "NULL = unlimited" in one place
- Documentation says "NULL = 1-on-1" in another place
- Database comment says NULL means unlimited

**Recommendation:**  
Standardize behavior across codebase. Choose one approach:
- **Option A:** NULL = 1 (1-on-1 session) - Update all docs and comments
- **Option B:** NULL = unlimited - Update code to handle NULL specially

---

### 11. **Capacity = 0 Edge Case Not Handled**
**File:** `Calender-integration.md:453`

**Issue:**  
Documentation mentions that `capacity = 0` means "Session visible but not bookable (display only)", but this edge case is not handled in the database constraints or the `book_session` function.

**Recommendation:**  
Either implement this behavior or remove the note from documentation.

---

## Database Schema Issues

### 12. **Missing CHECK Constraint on Capacity**
**File:** `docs/migrations/create_sessions_schema.sql:45`

**Issue:**  
The capacity column should have a CHECK constraint to ensure it's greater than 0 when not NULL. Allowing a capacity of 0 or negative values could lead to unexpected behavior.

**Recommendation:**  
```sql
capacity INTEGER DEFAULT 1 CHECK (capacity > 0),
```

---

### 13. **Missing CHECK Constraint on Duration**
**File:** `docs/migrations/create_sessions_schema.sql:44`

**Issue:**  
The `duration_minutes` column has a default of 60 but no CHECK constraint to ensure it's positive. Sessions with zero or negative duration should be prevented at the database level.

**Recommendation:**  
```sql
duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
```

---

### 14. **Missing CHECK Constraint on Date Range**
**File:** `docs/migrations/create_sessions_schema.sql:48-49`

**Issue:**  
The database migration should include a CHECK constraint to ensure that `ends_at` is after `starts_at`. Without this constraint, sessions with invalid time ranges can be created.

**Recommendation:**  
```sql
CONSTRAINT valid_time_range CHECK (ends_at > starts_at)
```

---

### 15. **Flawed Session Existence Check**
**File:** `docs/migrations/create_sessions_schema.sql:325`

**Issue:**  
In the `book_session` function, when checking if the session exists, both `v_capacity` and `v_session_status` are checked for NULL. However, if only `v_capacity` is NULL but `v_session_status` has a value, this would incorrectly indicate the session doesn't exist.

**Recommendation:**  
```sql
IF NOT FOUND THEN
  -- Handle session not found
END IF;
```

---

## Documentation Issues

### 16. **Filename Spelling Error**
**File:** `Calender-integration.md:1`

**Issue:**  
The documentation file has a spelling error in the filename. It should be "Calendar-integration.md" instead of "Calender-integration.md".

**Recommendation:**  
Rename the file to `Calendar-integration.md`.

---

### 17. **Contradictory Documentation on NULL Capacity**
**File:** `Calender-integration.md:74`

**Issue:**  
The documentation states "NULL = 1-on-1, unlimited" which is contradictory and unclear. Based on the implementation, NULL capacity defaults to 1 (1-on-1 session), not unlimited.

**Recommendation:**  
```markdown
| capacity | INTEGER | Max attendees (NULL = 1, i.e. 1-on-1 session) |
```

---

### 18. **Inaccurate RLS Policy Comment**
**File:** `docs/migrations/create_sessions_schema.sql:154-159`

**Issue:**  
The RLS policy allows trainers to read cancelled sessions they created, but the policy comment says "Anyone can read scheduled sessions". The policy implementation is broader than what the comment suggests.

**Recommendation:**  
Update the comment to accurately reflect that trainers can also read their own cancelled/completed sessions.

---

## Summary Statistics

- **Total Issues:** 18
- **Critical Security:** 1
- **High Priority:** 6
- **Medium Priority:** 5
- **Database Schema:** 4
- **Documentation:** 2

---

## Recommended Action Order

1. **Immediately:** Fix critical security issue (#1)
2. **Before next release:** Fix high priority issues (#2-6)
3. **Sprint backlog:** Address medium priority issues (#7-11)
4. **Technical debt:** Database schema improvements (#12-15)
5. **Documentation cleanup:** Fix documentation issues (#16-18)

---

*Generated: 2026-01-10*
