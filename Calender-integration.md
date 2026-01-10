# Calendar & Booking System Integration Plan

## Overview

Build a custom calendar booking system for Forge Sports Performance PWA with:
- **Session management** for trainers/owners (create, edit, cancel sessions)
- **Client booking** (direct booking with capacity limits)
- **iCal export** so owners can view schedule in Google Calendar, Apple Calendar, etc.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         FORGE PWA                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   CLIENT SIDE                         TRAINER/ADMIN SIDE          │
│   ─────────────                       ──────────────────          │
│   /schedule                           /admin/sessions             │
│   - View available sessions           - Create sessions           │
│   - Book sessions                     - Edit/cancel sessions      │
│   - Cancel bookings                   - View bookings per session │
│   - View my bookings                  - Mark attendance           │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                         SUPABASE                                  │
│   ─────────────────────────────────────────────────────────────   │
│   Tables: sessions, bookings, session_types                       │
│   RLS: Clients book own, Trainers manage own sessions             │
│   Functions: book_session() with atomic capacity check            │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                       iCAL EXPORT                                 │
│   ─────────────────────────────────────────────────────────────   │
│   /api/calendar/[trainerId].ics                                   │
│   - Owner subscribes in Google/Apple Calendar                     │
│   - Read-only view of all their sessions                          │
│   - Auto-syncs every few hours                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### `session_types`
Categories for filtering sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(50) | Display name (e.g., "Strength") |
| slug | VARCHAR(50) | URL-safe identifier |
| color | VARCHAR(7) | Hex color for UI |
| icon | VARCHAR(50) | Material icon name |
| is_premium | BOOLEAN | Premium badge styling |

#### `sessions`
Scheduled classes and appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| trainer_id | UUID | FK to profiles |
| session_type_id | UUID | FK to session_types (nullable) |
| title | VARCHAR(100) | Session name |
| description | TEXT | Optional details |
| duration_minutes | INTEGER | Length of session |
| capacity | INTEGER | Max attendees (NULL = 1-on-1, unlimited) |
| is_premium | BOOLEAN | Premium session flag |
| location | VARCHAR(200) | Where it takes place |
| starts_at | TIMESTAMPTZ | Start date/time |
| ends_at | TIMESTAMPTZ | End date/time |
| status | VARCHAR(20) | scheduled, cancelled, completed |
| cancelled_at | TIMESTAMPTZ | When cancelled (if applicable) |
| cancellation_reason | TEXT | Why cancelled |
| created_at | TIMESTAMPTZ | Record created |
| updated_at | TIMESTAMPTZ | Last modified |

#### `bookings`
Client reservations for sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to sessions |
| client_id | UUID | FK to profiles |
| status | VARCHAR(20) | confirmed, cancelled, attended, no_show |
| booked_at | TIMESTAMPTZ | When booked |
| cancelled_at | TIMESTAMPTZ | When cancelled (if applicable) |
| cancellation_reason | TEXT | Why cancelled |
| UNIQUE | (session_id, client_id) | Prevent duplicate bookings |

### RLS Policies

**session_types:**
- Anyone can read
- Admins can create/update/delete

**sessions:**
- Anyone can read scheduled sessions
- Trainers can create sessions (trainer_id = auth.uid())
- Trainers can update/cancel their own sessions
- Admins can manage all sessions

**bookings:**
- Clients can read their own bookings
- Trainers can read bookings for their sessions
- Clients can create bookings (client_id = auth.uid())
- Clients can cancel their own bookings

### Database Functions

**`book_session(session_id, client_id)`**
- Atomic booking with capacity check
- Returns: success boolean, booking_id, error_message
- Handles race conditions (two people booking last spot)
- Prevents duplicate bookings

**`get_session_availability(session_id)`**
- Returns: capacity, booked_count, spots_left, is_full

---

## API Routes

### Sessions API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/sessions` | List sessions (with filters) | Public |
| POST | `/api/sessions` | Create session | Trainer |
| GET | `/api/sessions/[id]` | Get single session | Public |
| PATCH | `/api/sessions/[id]` | Update session | Trainer (owner) |
| DELETE | `/api/sessions/[id]` | Cancel session | Trainer (owner) |
| POST | `/api/sessions/[id]/book` | Book session | Client |

**GET `/api/sessions` Query Params:**
- `date` - Filter by date (YYYY-MM-DD)
- `from` / `to` - Date range
- `type` - Filter by session_type slug
- `trainer_id` - Filter by trainer
- `include_full` - Include fully booked sessions (default: true)

### Bookings API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/bookings` | List user's bookings | Client |
| GET | `/api/bookings/[id]` | Get single booking | Owner |
| PATCH | `/api/bookings/[id]` | Cancel booking | Owner |

**GET `/api/bookings` Query Params:**
- `status` - Filter by status (confirmed, cancelled, etc.)
- `upcoming` - Only future sessions (default: true)

### iCal Feed API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/calendar/[trainerId].ics` | iCal feed for trainer | Token* |

*Uses a secure token in query string (not OAuth) for calendar app compatibility.

---

## iCal Export Feature

### How It Works

1. **Generate Feed URL:**
   ```
   https://forge-app.com/api/calendar/abc123.ics?token=xyz789
   ```

2. **Owner Subscribes:**
   - Google Calendar: Settings → Add calendar → From URL
   - Apple Calendar: File → New Calendar Subscription
   - Outlook: Add calendar → Subscribe from web

3. **Auto-Sync:**
   - Calendar apps poll the URL every 1-6 hours
   - Any changes in your system reflect automatically

### iCal Feed Contents

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Forge Sports Performance//Sessions//EN
X-WR-CALNAME:Forge Sessions
BEGIN:VEVENT
UID:session-abc123@forge-app.com
DTSTART:20250115T060000Z
DTEND:20250115T070000Z
SUMMARY:Iron Circuit (5/8 booked)
DESCRIPTION:Strength session\n\nBooked: 5 of 8 spots
LOCATION:Forge Gym - Main Floor
STATUS:CONFIRMED
END:VEVENT
...
END:VCALENDAR
```

### Feed Security

- Each trainer gets a unique, unguessable token
- Token can be regenerated if compromised
- Feed is read-only (no write access via iCal)

### Admin UI for iCal

In the trainer's settings/profile:
- "Calendar Sync" section
- Shows their unique feed URL
- Copy button for easy sharing
- "Regenerate URL" button (invalidates old URL)
- Instructions for subscribing in common calendar apps

---

## File Structure

### New Files to Create

```
docs/
  migrations/
    create_sessions_schema.sql      # Database migration

lib/
  types/
    sessions.ts                     # Session, Booking, SessionType types
  services/
    sessions.ts                     # Session CRUD operations
    bookings.ts                     # Booking operations
    calendar.ts                     # iCal feed generation

app/
  api/
    sessions/
      route.ts                      # GET (list), POST (create)
      [id]/
        route.ts                    # GET, PATCH, DELETE
        book/
          route.ts                  # POST (book session)
    bookings/
      route.ts                      # GET (list user bookings)
      [id]/
        route.ts                    # GET, PATCH (cancel)
    calendar/
      [trainerId]/
        route.ts                    # GET iCal feed (.ics)

  admin/
    layout.tsx                      # Auth guard for trainer/admin
    sessions/
      page.tsx                      # Session list/calendar view
      new/
        page.tsx                    # Create session form
      [id]/
        page.tsx                    # Edit session, view bookings
    settings/
      calendar/
        page.tsx                    # iCal feed URL management

  schedule/
    components/
      SessionCard.tsx               # Refactored from page.tsx
      BookingModal.tsx              # Confirmation dialog
      DateStrip.tsx                 # Calendar date picker
```

### Files to Modify

```
lib/types/database.ts               # Add Session, Booking, SessionType types
app/schedule/page.tsx               # Replace mock data with real queries
```

---

## Implementation Phases

### Phase 1: Database Foundation
**Goal:** Set up tables, types, and basic queries

- [x] Create migration file with all tables, indexes, RLS policies
- [x] Run migration in Supabase
- [x] Add TypeScript types to `lib/types/`
- [x] Create `lib/services/sessions.ts` with basic CRUD
- [x] Create `lib/services/bookings.ts` with book/cancel
- [x] Test queries in Supabase dashboard

**Key files:**
- `docs/migrations/create_sessions_schema.sql`
- `lib/types/sessions.ts`
- `lib/services/sessions.ts`
- `lib/services/bookings.ts`

---

### Phase 2: API Routes
**Goal:** RESTful endpoints for sessions and bookings

- [x] Create `/api/sessions` routes (list, create, get, update, delete)
- [x] Create `/api/sessions/[id]/book` route
- [x] Create `/api/bookings` routes (list, get, cancel)
- [x] Add rate limiting to booking endpoint
- [x] Add audit logging for bookings
- [x] Test all endpoints with curl/Postman

**Key files:**
- `app/api/sessions/route.ts`
- `app/api/sessions/[id]/route.ts`
- `app/api/sessions/[id]/book/route.ts`
- `app/api/bookings/route.ts`
- `app/api/bookings/[id]/route.ts`

---

### Phase 3: Client Schedule UI
**Goal:** Replace mock data, implement booking flow

- [ ] Fetch real sessions from API based on selected date
- [ ] Display spots remaining from database
- [ ] Implement booking modal with confirmation
- [ ] Handle booking success/error states
- [ ] Show "Booked" state for sessions user has reserved
- [ ] Implement booking cancellation
- [ ] Add pull-to-refresh / auto-refresh for availability

**Key files:**
- `app/schedule/page.tsx` (major update)
- `app/schedule/components/BookingModal.tsx` (new)

---

### Phase 4: Trainer Admin UI
**Goal:** Session management interface for owner

- [ ] Create admin layout with auth guard
- [ ] Build session list page (table or calendar view)
- [ ] Build create session form
- [ ] Build edit session page
- [ ] Show bookings per session with client names
- [ ] Implement session cancellation (notify booked clients?)
- [ ] Add quick actions (duplicate session, mark complete)

**Key files:**
- `app/admin/layout.tsx`
- `app/admin/sessions/page.tsx`
- `app/admin/sessions/new/page.tsx`
- `app/admin/sessions/[id]/page.tsx`

---

### Phase 5: iCal Export
**Goal:** Owner can view schedule in external calendar apps

- [ ] Create `lib/services/calendar.ts` for iCal generation
- [ ] Create `/api/calendar/[trainerId]/route.ts` endpoint
- [ ] Generate secure per-trainer tokens
- [ ] Build calendar settings page in admin
- [ ] Add copy-to-clipboard for feed URL
- [ ] Add token regeneration feature
- [ ] Test with Google Calendar and Apple Calendar
- [ ] Add setup instructions in UI

**Key files:**
- `lib/services/calendar.ts`
- `app/api/calendar/[trainerId]/route.ts`
- `app/admin/settings/calendar/page.tsx`

---

## Verification Checklist

### Database
- [ ] All tables created with correct columns
- [ ] RLS policies working (test as client vs trainer)
- [ ] `book_session()` function prevents overbooking
- [ ] Indexes improve query performance

### API
- [ ] GET /api/sessions returns filtered results
- [ ] POST /api/sessions creates session (trainer only)
- [ ] POST /api/sessions/[id]/book handles capacity correctly
- [ ] Booking same session twice returns error
- [ ] Booking full session returns error
- [ ] Rate limiting prevents abuse

### Client UI
- [ ] Sessions load for selected date
- [ ] Spots remaining updates after booking
- [ ] Booking modal shows correct session details
- [ ] Success state shows after booking
- [ ] "Booked" badge appears on user's sessions
- [ ] Can cancel booking from schedule page

### Admin UI
- [ ] Only trainers/admins can access /admin
- [ ] Can create new session with all fields
- [ ] Can edit existing session
- [ ] Can cancel session
- [ ] Can see list of booked clients

### iCal Export
- [ ] Feed URL returns valid .ics file
- [ ] Google Calendar successfully subscribes
- [ ] Apple Calendar successfully subscribes
- [ ] Sessions appear with correct times
- [ ] Cancelled sessions don't appear (or show as cancelled)
- [ ] Token regeneration invalidates old URL

### Mobile
- [ ] Schedule page works on 375px viewport
- [ ] Touch targets are 44px minimum
- [ ] Booking modal scrollable on small screens
- [ ] Admin pages usable on mobile

---

## Future Enhancements (Post-Launch)

1. **Recurring Sessions** - "Every Monday at 6am" with RRULE support
2. **Waitlist** - Join waitlist when session is full, auto-notify on opening
3. **Push Notifications** - Booking confirmations, reminders, cancellations
4. **Two-Way Calendar Sync** - Create sessions from Google Calendar (complex)
5. **Cancellation Policy** - Time limits for client cancellations
6. **Session Packages** - Buy 10 sessions, track credits
7. **Attendance Tracking** - Mark attended/no-show, track client history
8. **Analytics Dashboard** - Popular times, booking rates, no-show rates

---

## Technical Notes

### Timezone Handling
- Store all times as TIMESTAMPTZ (UTC) in database
- Convert to user's local timezone in UI
- iCal feeds use UTC with timezone hints

### Capacity Edge Cases
- `capacity = NULL` → 1-on-1 session (only one booking allowed)
- `capacity = 1` → Same as above but explicit
- `capacity = 0` → Session visible but not bookable (display only)

### Session Status Flow
```
scheduled → completed (after end time)
scheduled → cancelled (trainer cancels)
```

### Booking Status Flow
```
confirmed → attended (trainer marks)
confirmed → no_show (trainer marks)
confirmed → cancelled (client cancels)
```

### iCal Refresh Behavior
- Google Calendar: Refreshes every 12-24 hours
- Apple Calendar: Refreshes every 1-6 hours (configurable)
- Can't force immediate refresh from server side
