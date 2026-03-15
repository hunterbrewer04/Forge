# Forge PWA — Comprehensive Improvements (2026-03-15)

**Branch:** `feature/admin-dashboard`
**Files changed:** 30+ across all modules
**Net:** ~1,100 lines added, ~1,050 removed (including dead code deletion)

---

## Phase 1: Quick Wins

### 1.1 Rename "Admin Panel" to "Admin Dashboard"
- Updated `GlassSidebar.tsx` and `Sidebar.tsx` (now deleted) nav label text

### 1.2 Calendar Lookahead Expanded (14 → 60 days)
- `lib/hooks/useScheduleData.ts` — default end range changed from +14 to +60 days
- Users can now see sessions up to 2 months out

### 1.3 Session Type Filters on Schedule Page
- Wired `SessionFilters` component into `app/schedule/page.tsx`
- Added `activeFilter` state and filtering logic on `selectedDateSessions`
- Fixed old dark-theme classes in `SessionFilters.tsx` to use CSS variable tokens
- Destructured `filters` from `useScheduleData()` hook

### 1.4 NextUpCard on Home Dashboard
- Created `app/home/components/HomeNextUpCard.tsx` — adapted from `NextUpCard` to accept slim `NextSession` props
- Includes countdown timer (via extracted `useCountdown` hook) and "View Details" link
- Integrated into both mobile and desktop home page layouts

### 1.5 Cancellation Reason Input
- `CancelBookingModal.tsx` — added optional textarea for cancellation reason
- Reason passed to API (`reason.trim() || 'Cancelled by user'`)
- State resets on modal close

### 1.6 Session Type Colors on Schedule Cards
- `SessionCard.tsx` — uses `session.session_type?.color` for icon background/color via inline styles
- Falls back to `text-primary` / `bg-bg-secondary` when no color set

---

## Phase 2: Admin Dashboard Improvements

### 2.1 React Query Migration
Created 4 new hooks replacing inline `useState` + `useEffect` + `fetch` patterns:
- `lib/hooks/admin/useAdminUsers.ts` — paginated search with debounce, role mutations
- `lib/hooks/admin/useAdminTiers.ts` — CRUD mutations with cache invalidation
- `lib/hooks/admin/useAdminFinances.ts` — `useInfiniteQuery` for cursor-based invoice pagination, revenue stats
- `lib/hooks/admin/useAdminSettings.ts` — `useReducer` for form state, dirty-field diffing on save

All 4 admin pages (`users`, `tiers`, `finances`, `settings`) rewritten to use these hooks.

### 2.2 Mobile Rendering Optimization
- Each admin hook accepts `enabled` parameter
- Admin pages pass `enabled: isDesktop` via `useIsDesktop()` hook
- Prevents data fetching on mobile where "Desktop Only" message is shown

---

## Phase 3: Feature Gaps

### 3.1 Cascade Session Cancellation to Bookings
- Added `cancelSessionBookings(db, sessionId, reason)` to `modules/calendar-booking/services/bookings.ts`
- Uses single batch `inArray` UPDATE (not N individual queries)
- Called from `app/api/sessions/[id]/route.ts` PATCH handler when session status set to cancelled
- Sends push notifications to affected clients via `sendPushToUser`
- Adds `BOOKING_CANCEL` audit log entries per affected booking

### 3.2 Trainer Session Edit UI Improvements
- `app/trainer/sessions/[id]/page.tsx` — expanded form with `description`, `location`, `capacity`, `is_premium` fields
- Removed "Lesson"-only filter on session types — all types shown in dropdown
- Title changed from locked select to free-text input
- Fields included in both save and duplicate operations

### 3.3 Past Sessions View
- Added Upcoming/Past segmented toggle to `app/schedule/page.tsx`
- Past mode fetches sessions from 60 days ago with `status=completed,cancelled`
- `app/api/sessions/route.ts` — added support for comma-separated status values via `inArray`
- `useScheduleData` — added typed `statusFilter: readonly SessionStatus[]` parameter
- `SessionCard` — added `isPastView` prop showing status badges (Completed/Cancelled) instead of Book buttons

---

## Phase 4: Messaging Module Overhaul

### 4.0 Ably Chat SDK Setup
- Installed `@ably/chat` package
- Created `lib/ably-chat-browser.ts` — ChatClient singleton wrapping existing Ably Realtime client
- Created `app/chat/components/ChatProviders.tsx` — combines `ChatClientProvider` + `ChatRoomProvider`
- `ChatWindow.tsx` refactored: default export wraps `ChatWindowInner` in `ChatProviders`
- Raw Ably channel subscriptions for messages preserved (server publishes via raw REST)

### 4.1 Typing Indicators
- `MessageInput.tsx` — `useTyping()` hook with throttled `keystroke()` (3s) on input, `stop()` on send
- `ChatWindow.tsx` — displays animated typing dots + client IDs below messages area

### 4.2 Presence / Online Status
- `ChatWindow.tsx` — `usePresence()` auto-enters room, `usePresenceListener()` tracks others
- Header presence dot and label now dynamic (green "Online" / gray "Offline")
- `isOtherUserOnline` memoized via `useMemo`

### 4.3 Message Reactions
- Created `app/chat/components/ReactionBar.tsx` — 6 emoji picker (thumbs up, heart, laugh, wow, sad, fire)
- `ChatWindow.tsx` — `useRoomReactions()` with floating emoji overlay (capped at 20, auto-removes after 2.5s)
- Timer cleanup on unmount via tracked ref
- Smile icon button in chat header toggles reaction bar

### 4.4 Chat UI Polish & Theming
- `ClientConversationList.tsx` — all old dark-theme classes replaced with CSS variable tokens
- `ChatWindow.tsx` — removed broken `fetchSenderProfile`, replaced with prop-based name resolution
- `ConversationList.tsx` — removed non-functional FAB "new message" button
- Video rendering fixed with consistent `aspect-video` container pattern

---

## Phase 5: UI Redesigns

### 5.1 Profile Page Redesign
- Equal 2-column grid (`grid-cols-2`) replacing lopsided `1fr 2fr`
- Left: Identity card with gradient header banner (primary → orange → amber), avatar with gradient ring overlapping banner edge, theme toggle, sign out
- Right: Settings card with 3 grouped sections (Account, Billing & Tools, Security) with colored icon accents
- All CSS variable theming

### 5.2 Home Dashboard Updates
- Forge logo (`Forge-Full-Logo.PNG`) added to greeting banner in both desktop and mobile headers
- Messages card given `flex-1` for even column alignment on desktop

### 5.3 Navigation Sidebar Redesign
- `GlassSidebar.tsx` — replaced full logo header with user avatar + name + role
- Small "FORGE Performance" branding text added at bottom of sidebar
- Removed hardcoded "always online" presence dot (misleading without real presence data)
- **Deleted dead files:** `components/navigation/Sidebar.tsx` and `components/layout/AppLayout.tsx` — never imported by any page

### 5.5 Modal Theming (Light/Dark)
- `BookingModal.tsx`, `SessionDetailsSheet.tsx`, `CancelBookingModal.tsx` — all hardcoded dark classes (`bg-surface-dark`, `text-gray-400`, `bg-gray-700`) replaced with CSS variable tokens
- Detail rows upgraded to icon box treatment (`bg-primary/8 rounded-[10px]`) with label/value pairs
- Close button: rounded circle with border instead of bare icon
- Availability section: card treatment with `bg-bg-secondary border border-border`
- All modal states (loading, success, error) themed consistently
- Created shared `SessionInfoBlock` component eliminating ~120 lines of duplication between BookingModal and SessionDetailsSheet

---

## Code Quality Improvements (Simplify Passes)

Three rounds of automated code review identified and fixed:

### Critical / High
- **N+1 → batch update:** `cancelSessionBookings` uses single `inArray` UPDATE instead of N individual queries
- **Memory leak fix:** Reaction floats capped at 20, timer IDs tracked and cleaned on unmount

### Medium
- **Date utility deduplication:** Added `formatSessionTime()`, `formatSessionDate()`, and optional `date` param to `getLocalDateString()` in `lib/utils/date.ts` — replaced 9 inline duplicates
- **`useCountdown` hook extracted:** `lib/hooks/useCountdown.ts` — shared between `HomeNextUpCard` and `NextUpCard`
- **`SessionInfoBlock` component extracted:** `app/schedule/components/SessionInfoBlock.tsx` — shared between BookingModal and SessionDetailsSheet
- **Stale closure fix:** `useScheduleData` replaced `sessions.length` dep with stable `hasLoadedRef`
- **`useInfiniteQuery` migration:** Admin finances pagination unified into React Query cache (eliminated hybrid local state)
- **Dead props removed:** `userId` and `onCancel` removed from `SessionCard` interface
- **Dead files deleted:** `Sidebar.tsx`, `AppLayout.tsx`
- **Passthrough wrapper removed:** `handleCreate` in tiers page → pass `createTier` directly

### Low
- **`isDirty` memoized** in `useAdminSettings` (avoids `JSON.stringify` on every render)
- **`invoices` array memoized** in `useAdminFinances` (stable reference for children)
- **`isOtherUserOnline` memoized** in `ChatWindow`
- **Keystroke throttled** to 3s in `MessageInput`
- **`RoleFilter` type guard** added — runtime validation replacing unsafe `as` cast
- **Typed `statusFilter`** — `SessionStatus[]` with compile-time safety replacing comma-separated string
- **Hardcoded presence dots** removed from sidebar user headers

---

## New Files Created

| File | Purpose |
|------|---------|
| `lib/hooks/admin/useAdminUsers.ts` | React Query hook for admin users page |
| `lib/hooks/admin/useAdminTiers.ts` | React Query hook for admin tiers page |
| `lib/hooks/admin/useAdminFinances.ts` | React Query hook with `useInfiniteQuery` for finances |
| `lib/hooks/admin/useAdminSettings.ts` | React Query hook with `useReducer` for settings |
| `lib/hooks/useCountdown.ts` | Shared countdown timer hook |
| `lib/ably-chat-browser.ts` | Ably Chat SDK client singleton |
| `app/chat/components/ChatProviders.tsx` | Chat SDK provider wrapper |
| `app/chat/components/ReactionBar.tsx` | Emoji reaction picker |
| `app/home/components/HomeNextUpCard.tsx` | Home page next session card |
| `app/schedule/components/SessionInfoBlock.tsx` | Shared session info display |
| `docs/2026-03-15-comprehensive-improvements.md` | This document |

## Files Deleted

| File | Reason |
|------|--------|
| `components/navigation/Sidebar.tsx` | Dead code — never imported by any page |
| `components/layout/AppLayout.tsx` | Dead code — never imported by any page |
