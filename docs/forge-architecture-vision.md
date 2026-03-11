# Forge — Architecture Vision

> **Living document.** Captures the agreed architectural direction for Forge. Updated as decisions are refined.
> Implementation plans live in `docs/plans/`.

---

## The Current State

The calendar and booking system is fully functional and well-built, but deeply coupled to Supabase
in ways that limit flexibility. Key issues:

- Supabase auth is baked into every API route and page — can't swap auth providers without touching 20+ files
- Core booking logic lives inside Supabase Postgres RPC functions (not in the codebase) — invisible, untestable, unmovable
- Business logic and data access tied to the Supabase JS client (PostgREST), not standard Postgres
- Calendar/booking code is scattered across `app/`, `lib/`, `components/` with no module boundary
- Two fully-built components (`SessionFilters`, `NextUpCard`) are wired up nowhere — dead code
- Session cancellation doesn't cascade to client bookings — real user-facing gap

---

## The Vision

### 1. Auth: Supabase → Clerk

Replace Supabase auth with Clerk. The existing login/signup page designs stay completely untouched — only the underlying auth calls change. Clerk handles identity only; user roles and permissions (`is_trainer`, `is_admin`, `has_full_access`) stay in the Postgres `profiles` table where they belong.

**Why Clerk:** Managed auth that's clean to integrate, free up to 10k monthly active users, and far less coupled to the rest of the stack than Supabase auth.

**Portability:** Clerk user data can be exported. Password-based users would need a password reset on a future migration; social login users (Google/Apple) are unaffected. Because roles live in our own DB (not in Clerk metadata), a future auth migration only touches the identity layer.

### 2. Database: Supabase JS Client → Drizzle ORM

Keep Supabase as the Postgres host. Change how the app talks to it: instead of going through PostgREST (the Supabase JS client's API layer), connect directly to Postgres via Drizzle ORM using a standard `DATABASE_URL` connection string.

**What Drizzle is:** A TypeScript ORM that runs inside the Next.js app (it's just an npm package, not a service). The database still lives on Supabase's servers — nothing about data hosting changes.

**Why this matters for portability:** When you want to move to Neon, Railway, or any other Postgres provider, you change one environment variable. Zero code changes.

**The business logic move:** Supabase RPC functions (`book_session`, `get_sessions_availability_batch`, etc.) contain real booking logic that currently lives inside Postgres, invisible to the codebase. These move into TypeScript in the service layer — visible, testable, and fully portable.

**Security model:** Without RLS, security is enforced at the API layer:
- `DATABASE_URL` is server-only — never in the browser
- All data access goes through authenticated Next.js API routes
- Clerk's `auth()` is called at the top of every route — no user = 401
- Supabase network restrictions lock DB access to Vercel's IPs only

### 3. Module Structure: Reusable by Design

Reorganize the calendar/booking system into a self-contained module folder (`modules/calendar-booking/`) with its own types, config, and services.

```
modules/calendar-booking/
  config.ts              # DrizzleInstance, CalendarBookingAuthContext, CalendarBookingConfig
  index.ts               # Public API exports
  types/index.ts         # Session, Booking, SessionType, filters, inputs (snake_case API types)
  services/
    bookings.ts          # bookSession() — atomic transaction with row locking
    availability.ts      # getSessionAvailability(), getSessionsAvailabilityBatch()
    calendar.ts          # iCal generation, token CRUD, feed generation
```

**The key design rule:** The module is auth-agnostic. It accepts a `db: DrizzleInstance` parameter — it doesn't call Clerk or any auth provider directly. API routes build a `CalendarBookingAuthContext` from their own auth layer and pass `db` to module functions. This means the module can be dropped into any Next.js + Postgres project with minimal wiring.

**What stays outside the module:**
- Schema (`lib/db/schema.ts`) — shared across all modules (sessions, bookings, profiles, conversations)
- API routes (`app/api/sessions|bookings|calendar/`) — own auth, rate limiting, validation, audit logging
- Client services (`lib/services/bookings.ts`, `lib/services/sessions.ts`) — fetch wrappers to API routes
- UI components (`app/schedule/components/`) — React components, hooks
- Shared infra (`lib/api/auth.ts`, `lib/api/rate-limit.ts`, etc.)

**Build strategy:** Built inside Forge using Forge as the real-world test case. Extraction to a standalone repo is straightforward — copy the `modules/calendar-booking/` folder plus the relevant schema table definitions.

### 4. Feature Gaps (After Architecture Is Clean)

With the clean foundation in place, close the missing features:

**High priority:**
- Cascade session cancellation to bookings (with notifications)
- Wire up the `SessionFilters` component (already fully built)
- Render `NextUpCard` on the home dashboard (already fully built)

**Medium priority:**
- Trainer session edit UI (API already supports it, no UI exists)
- Expand calendar lookahead from 14 days to 60 days
- Recurring sessions (weekly/daily/custom repeat on creation)
- Email notification fallback (push-only is insufficient)

**Lower priority:**
- Past sessions view on the schedule page
- Cancellation reason input (currently hardcoded)
- Session type colors applied to cards

---

## Module 2: Messaging System

> The messaging system is production-ready for core 1-to-1 text + media chat. The module version
> replaces Supabase Realtime with Ably and Supabase Storage with Cloudflare R2, making it
> fully portable across any Next.js + Postgres project.

### What's Already Built

| Feature | Status |
|---|---|
| Text messaging | Full |
| Image + video attachments | Full (images 10MB, videos 50MB) |
| Read receipts | Full |
| Unread badges | Full |
| Real-time delivery | Full via Supabase Realtime (to be replaced with Ably) |
| Push notifications on new messages | Full |
| Media lightbox viewer | Full (yet-another-react-lightbox) |
| Role-based access (trainer sees all, client sees one) | Full |
| Magic byte file validation | Full |
| Keyboard-aware input (iOS PWA) | Full |
| Typing indicators | Not built |
| Message deletion/editing | Not built |
| Document attachments (PDF, etc.) | Not built |
| Voice messages | Not built |
| Group chat | Not built |

### Architecture Changes for the Module

**Real-time: Supabase Realtime → Ably**

Current system uses Supabase postgres_changes subscriptions (tightly coupled to Supabase). The module version uses Ably:
- Server publishes to an Ably channel when a message is saved to DB
- Client subscribes to that channel — receives messages instantly
- Works on Vercel serverless natively (no shared state needed)
- Module accepts an Ably client as configuration — swap Ably for another pub/sub later with one change

**Cost:**
- Free: 3M messages/month, 200 concurrent connections
- At Forge's scale (50 clients, 20 msgs/day): ~90,000 units/month — Free indefinitely
- Paid ($25/mo) only kicks in at ~3,000+ active daily chatting clients

**Media Storage: Supabase Storage → Cloudflare R2**

Current system stores images/videos in Supabase Storage `chat-media` bucket with 1-hour signed URLs. The module version uses Cloudflare R2:
- S3-compatible API — works with any S3 client, portable to any project
- Zero egress fees — critical for video-heavy chat apps
- 10GB free storage, $0.015/GB after
- Files served via a public R2 domain or custom domain

### Module Structure

```
modules/messaging/
  types/
    index.ts
  db/
    schema.ts
    migrations/
  services/
    messages.ts
    conversations.ts
    storage.ts
    realtime.ts
  hooks/
    useMessages.ts
    useUnreadCount.ts
  components/
    ChatWindow.tsx
    MessageInput.tsx
    ConversationList.tsx
    ClientConversationList.tsx
    MediaViewer.tsx
    MessageBubble.tsx
  api/
    messages.ts
    upload.ts
    conversations.ts
  index.ts
```

**Module configuration interface:**
```typescript
interface MessagingConfig {
  auth: MessagingAuthContext     // userId, role (from Clerk or any auth)
  db: DrizzleInstance            // Drizzle connected to any Postgres
  ably: Ably.Realtime            // Ably client instance
  storage: R2BucketConfig        // Cloudflare R2 credentials
}
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth provider | Clerk | Clean integration, free tier, decoupled from DB |
| Database access | Drizzle ORM + direct Postgres | Any Postgres host, schema in codebase |
| Role storage | Postgres `profiles` table | Not in Clerk — stays portable |
| Module approach | Folder in Forge, extract later | Build against real use case first |
| Security enforcement | API layer (Clerk + query filters) | DB not directly accessible from browser |
| Login/signup UI | Keep existing pages | Only auth calls change, not UI |
| Messaging real-time | Ably | Free 3M msgs/month, works on serverless, low complexity |
| Media storage | Cloudflare R2 | Zero egress fees, S3-compatible, 10GB free, fully portable |

---

## Implementation Phases

| Phase | Plan Document | Status |
|---|---|---|
| 1. Clerk Auth Migration | `docs/plans/2026-03-06-clerk-auth-migration.md` | Complete |
| 2. Drizzle ORM Migration | `docs/plans/drizzle-orm-migration.md` | Complete |
| 3. Calendar/Booking Module | `docs/plans/2026-03-06-calendar-booking-module.md` | Complete |
| 4. Messaging Module (Ably + R2) | `docs/plans/2026-03-11-messaging-module-phase4.md` | Complete |
| 5. Feature Gaps | TBD | After Phase 4 complete |
