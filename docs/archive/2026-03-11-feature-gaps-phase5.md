# Phase 5: Feature Gaps

> **Status:** Planning
> **Branch:** TBD (after Phase 4 merge to main)
> **Depends on:** Phases 1-4 complete, users migrated to Clerk, media migrated to R2

---

## Context

Phases 1-4 rebuilt the infrastructure (Clerk Auth, Drizzle ORM, Calendar/Booking Module, Messaging Module). The app is now fully decoupled from Supabase client libraries. Phase 5 closes feature gaps — things that were missing, half-wired, or deferred during the architecture work.

---

## High Priority

### 1. Cascade Session Cancellation to Bookings

When a trainer cancels a session, all client bookings for that session should be automatically cancelled with notifications.

**Current behavior:** Session gets cancelled but bookings remain in `confirmed` status — clients don't know.

**Required:**
- When a session status is set to `cancelled`, update all `confirmed` bookings to `cancelled`
- Set `cancelled_at` and `cancellation_reason` on each booking (e.g., "Session cancelled by trainer")
- Send push notification to each affected client
- Email notification to each affected client (depends on email module — Resend)

**Files likely involved:**
- `app/api/sessions/[id]/route.ts` (PATCH handler)
- `modules/calendar-booking/services/bookings.ts`
- Push notification logic in `app/api/push/` routes

---

### 2. Wire Up SessionFilters Component

The `SessionFilters` component is fully built but not rendered anywhere.

**Required:**
- Add to the schedule page (`app/schedule/page.tsx`)
- Connect filter state to the session list query
- Filter by: session type, date range, availability

**Files likely involved:**
- `app/schedule/page.tsx`
- `app/schedule/components/SessionFilters.tsx` (already built)
- `lib/hooks/useScheduleData.ts`

---

### 3. Render NextUpCard on Home Dashboard

The `NextUpCard` component is fully built but not rendered on the home page.

**Required:**
- Add to the home dashboard (`app/home/page.tsx`)
- Shows the user's next upcoming booked session
- Links to session details

**Files likely involved:**
- `app/home/page.tsx`
- `app/schedule/components/NextUpCard.tsx` (already built)
- May need a lightweight API call or hook for next session data

---

## Medium Priority

### 4. Trainer Session Edit UI

The API supports editing sessions (`PATCH /api/sessions/[id]`), but there's no UI for trainers to edit an existing session.

**Required:**
- Edit page or modal for trainers to modify session details (title, description, time, capacity, location)
- Pre-populate form with current session data
- Validate changes (e.g., can't reduce capacity below current bookings)

**Files likely involved:**
- `app/trainer/sessions/[id]/page.tsx` (add edit functionality)
- `app/trainer/sessions/new/page.tsx` (reuse form components)

---

### 5. Expand Calendar Lookahead

Currently the calendar shows 14 days ahead. Expand to 60 days.

**Required:**
- Update the date range in schedule data fetching
- Ensure calendar UI handles the wider range (pagination or scroll)

**Files likely involved:**
- `lib/hooks/useScheduleData.ts`
- `app/schedule/page.tsx`
- Relevant API routes

---

### 6. Recurring Sessions

Allow trainers to create recurring sessions (weekly, daily, custom repeat).

**Required:**
- UI for selecting recurrence pattern on session creation
- Backend generates multiple session rows based on the pattern
- Option to cancel a single occurrence vs. the entire series

**Files likely involved:**
- `app/trainer/sessions/new/page.tsx`
- `app/api/sessions/route.ts` (POST handler)
- `modules/calendar-booking/` (new recurrence logic)

---

### 7. Email Notifications (Resend)

Push notifications alone are insufficient. Add email as a fallback/complement.

**Required:**
- Integrate Resend for transactional emails
- Email triggers: booking confirmation, session cancellation, session reminder
- Branded email templates matching Forge design

**New module:** `modules/email/` or `lib/email/`

---

## Lower Priority

### 8. Past Sessions View

Show completed/past sessions on the schedule page.

**Required:**
- Tab or toggle to switch between upcoming and past sessions
- Past sessions show status (completed, cancelled, no-show)

---

### 9. Cancellation Reason Input

Currently the cancellation reason is hardcoded. Let users provide a reason.

**Required:**
- Text input in the cancellation modal
- Store the reason in `cancellation_reason` column
- Display the reason in session/booking details

---

### 10. Session Type Colors on Cards

Session types have a `color` column in the database but it's not applied to session cards.

**Required:**
- Apply `session_types.color` to `SessionCard` component
- Use as accent/border color or badge color

---

## Notes

- Items 1-3 are quick wins — the components exist, they just need wiring
- Item 7 (Resend) is a new integration that could become its own module
- Item 6 (Recurring sessions) is the most complex — likely needs its own plan
- All items are additive — none require breaking changes to the architecture
