# Admin Dashboard Module — Implementation Plan

## Context

Forge currently has no admin panel. The `isAdmin` flag exists in the `profiles` table but is unused — no routes, layouts, or API endpoints leverage it. The facility owner (client) currently has to manage membership tiers manually in the Stripe Dashboard and has no visibility into member management, revenue, or facility settings from within the app.

This plan builds an admin dashboard as a new `modules/admin/` module following the same auth-agnostic, DI-based pattern established by `modules/calendar-booking/` and `modules/messaging/`. The module is designed for a single facility today but structured to support multi-tenant SaaS extraction later. A platform-level super-admin is explicitly deferred.

**Primary user:** Facility owner/admin (desktop only for now)
**Access:** Gated by `profiles.isAdmin === true`
**Layout:** Reuses `GlassAppLayout` with admin nav items in `GlassSidebar`

---

## Phase 0 — Setup

### 0.1 Save Plan Document

Save this plan to `docs/plans/2026-03-13-admin-dashboard-module.md` so the full vision is documented alongside the other phase plans.

### 0.2 Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/admin-dashboard
```

All admin dashboard work (Phases 1–4) lives on this branch, matching the branching strategy used for previous phases (`feature/drizzle-orm-migration` held Phases 1–4).

---

## Phase 1 — Foundation + User Management

**Goal:** Admin route with role gate, desktop layout, and full user management with Clerk invitations.

### 1.1 Module Scaffold

Create `modules/admin/` following established pattern:

```
modules/admin/
  index.ts               # Barrel exports (public API)
  config.ts              # AdminAuthContext, AdminConfig types
  types/
    index.ts             # Admin domain types (UserListItem, InviteInput, etc.)
  services/
    users.ts             # User CRUD, role management, profile queries
    invitations.ts       # Clerk invitation wrapper + role pre-assignment
```

**Config pattern** (matches calendar-booking/messaging):
- `AdminAuthContext`: `{ userId, profileId, isAdmin }` — injected, not imported
- Services accept `db: DrizzleInstance` as first param
- No direct Clerk imports in services — invitation calls go through a thin wrapper

**Files:**
- `modules/admin/config.ts` — DI types
- `modules/admin/types/index.ts` — domain types
- `modules/admin/services/users.ts` — user queries & role updates
- `modules/admin/services/invitations.ts` — Clerk invitation service
- `modules/admin/index.ts` — barrel exports

### 1.2 Admin Route + Layout Gate

**New route:** `app/admin/` with server-component layout gate (mirrors `app/trainer/layout.tsx` pattern).

```
app/admin/
  layout.tsx             # Server component: isAdmin check → redirect if unauthorized
  page.tsx               # Admin dashboard home (redirects to /admin/users initially)
  users/
    page.tsx             # User management page
```

**Layout gate** (`app/admin/layout.tsx`):
- Server component using Clerk `auth()` + Drizzle profile lookup
- Checks `profile.isAdmin === true`
- Redirects to `/home` if not admin
- Desktop-only enforcement: renders a "desktop only" message on mobile viewports (CSS-based, not a redirect — so the route still works but content is hidden behind a breakpoint gate)

**Files to modify:**
- `components/navigation/GlassSidebar.tsx` — add admin nav items (gated by `is_admin`)
- `components/navigation/Sidebar.tsx` — add admin nav items (gated by `is_admin`)

**Admin nav items to add:**
```typescript
const adminNavItems = profile?.is_admin
  ? [
      { href: '/admin/users', iconKey: 'users', label: 'Users' },
      // Future phases add more items here
    ]
  : []
```

### 1.3 User Management

**API Routes:**

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/users` | GET | `validateRole('admin')` | List all profiles with filters (role, status, search) |
| `/api/admin/users/[id]` | GET | `validateRole('admin')` | Get single user profile with membership details |
| `/api/admin/users/[id]` | PATCH | `validateRole('admin')` | Update user roles/access flags |
| `/api/admin/users/[id]` | DELETE | `validateRole('admin')` | Deactivate user (soft delete — set a flag, don't delete row) |
| `/api/admin/invitations` | POST | `validateRole('admin')` | Send Clerk invitation with optional role pre-assignment |
| `/api/admin/invitations` | GET | `validateRole('admin')` | List pending invitations |

**Module services (`modules/admin/services/users.ts`):**
- `listUsers(db, filters)` — paginated user list with role/status filters, search by name/email
- `getUser(db, userId)` — single profile with membership tier, Stripe subscription info
- `updateUserRoles(db, userId, roleUpdates)` — toggle `isTrainer`, `isMember`, `hasFullAccess`, `isAdmin`
- `deactivateUser(db, userId)` — soft deactivate (future: also revoke Clerk session)

**Module services (`modules/admin/services/invitations.ts`):**
- `sendInvitation(emailAddress, options?)` — wraps Clerk `clerkClient.invitations.createInvitation()`
  - Optional `role` param: stores intended role in invitation metadata (`publicMetadata.intendedRole`)
  - Clerk webhook (`user.created`) checks for `intendedRole` metadata and auto-assigns role on signup
- `listInvitations()` — wraps Clerk `clerkClient.invitations.getInvitationList()`
- `revokeInvitation(invitationId)` — wraps Clerk `clerkClient.invitations.revokeInvitation()`

**Clerk webhook update** (`app/api/webhooks/clerk/route.ts`):
- On `user.created` event: check if `publicMetadata.intendedRole` exists
- If role specified, auto-set the corresponding profile flag (`isTrainer`, `hasFullAccess`, etc.)
- This enables the "pre-assign role on invite" flow

**Frontend (`app/admin/users/`):**
- Desktop data table with columns: Name, Email, Role badges, Membership status, Joined date, Actions
- Search bar + role filter dropdown
- Row click → user detail slide-out or modal with:
  - Profile info
  - Role toggle switches (hasFullAccess, isMember, isTrainer, isAdmin)
  - Membership tier & status
  - Quick actions (view in Stripe, deactivate)
- "Invite User" button → modal with email input + optional role selector
- Confirmation modals for destructive actions (deactivate, role changes)

**Reuse existing:**
- `lib/api/auth.ts` `validateRole('admin')` — already implemented, just unused
- `lib/api/errors.ts` — standard error responses
- `lib/api/validation.ts` — Zod request validation
- `components/ui/ConfirmModal.tsx` — confirmation dialogs

---

## Phase 2 — Membership Tier Management

**Goal:** Admin can create, edit, and toggle membership tiers. Changes auto-sync to Stripe.

### 2.1 Tier CRUD API

**API Routes:**

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/tiers` | GET | `validateRole('admin')` | List all tiers (including inactive) |
| `/api/admin/tiers` | POST | `validateRole('admin')` | Create tier + auto-create Stripe Product/Price |
| `/api/admin/tiers/[id]` | PATCH | `validateRole('admin')` | Update tier (name, quota, price, isActive) |
| `/api/admin/tiers/[id]` | DELETE | `validateRole('admin')` | Archive tier (set isActive=false, archive Stripe Price) |

**Module services (`modules/admin/services/tiers.ts`):**
- `listTiers(db)` — all tiers (active + inactive), enriched with subscriber count
- `createTier(db, input)` — creates DB row + `stripe.products.create()` + `stripe.prices.create()`, stores `stripePriceId`
- `updateTier(db, tierId, updates)` — updates DB row. If price changes: creates new Stripe Price, archives old one, updates `stripePriceId`. If name changes: updates Stripe Product name
- `toggleTierVisibility(db, tierId, isActive)` — toggle `isActive` flag (controls paywall visibility)
- `archiveTier(db, tierId)` — set `isActive=false`, archive Stripe Price. Prevent if active subscribers exist

**Stripe sync logic:**
- Creating a tier → `stripe.products.create({ name })` then `stripe.prices.create({ product, unit_amount, currency, recurring: { interval: 'month' } })`
- Changing price → create new Price, archive old Price (`stripe.prices.update(oldId, { active: false })`), update DB `stripePriceId`
- Stripe Prices are immutable — you can't edit amount, only create new ones

**Frontend (`app/admin/tiers/`):**
- Card grid showing all tiers with: name, price, booking quota, subscriber count, active/inactive badge
- "Create Tier" button → form modal (name, monthly price, booking quota)
- Edit tier → inline or modal form
- Toggle switch for visibility (isActive)
- Warning modal if archiving a tier with active subscribers
- Live preview of how the tier will appear on the paywall

**Admin nav update:** Add `{ href: '/admin/tiers', iconKey: 'tiers', label: 'Tiers' }` to admin nav items.

**Files to modify:**
- `modules/admin/services/tiers.ts` — new service file
- `modules/admin/types/index.ts` — add tier management types
- `modules/admin/index.ts` — export new services/types
- `app/admin/tiers/page.tsx` — new page
- `GlassSidebar.tsx` / `Sidebar.tsx` — add tiers nav item

---

## Phase 3 — Financial Management

**Goal:** Revenue dashboard with basic stats, per-member subscription management (cancel, pause, resume, refund), and invoice history — all in-app via Stripe API.

### 3.1 Revenue Dashboard

**API Route:**

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/revenue` | GET | `validateRole('admin')` | Aggregate revenue stats |

**Module services (`modules/admin/services/revenue.ts`):**
- `getRevenueStats(db)` — returns:
  - Total active subscriptions (count from DB where `membershipStatus = 'active'`)
  - MRR (monthly recurring revenue — sum of active tier prices)
  - Total members, total trainers
  - New members this month
  - Revenue this month (via `stripe.balanceTransactions.list()` or `stripe.charges.list()`)

### 3.2 Subscription Management

**API Routes:**

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/subscriptions/[id]/cancel` | POST | `validateRole('admin')` | Cancel member's subscription |
| `/api/admin/subscriptions/[id]/pause` | POST | `validateRole('admin')` | Pause (set `pause_collection`) |
| `/api/admin/subscriptions/[id]/resume` | POST | `validateRole('admin')` | Resume paused subscription |
| `/api/admin/refunds` | POST | `validateRole('admin')` | Issue refund on a charge |
| `/api/admin/invoices` | GET | `validateRole('admin')` | List all invoices (facility-wide) |

**Module services (`modules/admin/services/subscriptions.ts`):**
- `cancelSubscription(db, profileId, options)` — `stripe.subscriptions.cancel()` or `stripe.subscriptions.update({ cancel_at_period_end: true })`
- `pauseSubscription(db, profileId)` — `stripe.subscriptions.update({ pause_collection: { behavior: 'void' } })`
- `resumeSubscription(db, profileId)` — `stripe.subscriptions.update({ pause_collection: '' })`
- `issueRefund(chargeId, amount?)` — `stripe.refunds.create({ charge, amount })`
- `listInvoices(filters)` — `stripe.invoices.list()` with date/status filters

**Frontend (`app/admin/finances/`):**
- Dashboard cards: MRR, active subscribers, new this month, total revenue
- Subscriptions table: member name, tier, status, next billing date, actions (cancel/pause/resume)
- Invoice history table with status, amount, date, PDF link
- Refund flow: select invoice → confirm amount → issue refund

**Admin nav update:** Add `{ href: '/admin/finances', iconKey: 'finances', label: 'Finances' }` to admin nav items.

---

## Phase 4 — Facility Settings

**Goal:** Admin can configure facility branding and operational settings.

### 4.1 Settings Storage

**New DB table or JSON column** — facility settings. Since this is single-facility for now, simplest approach is a `facility_settings` table with a single row (or key-value pairs). For SaaS readiness, use a proper table:

```sql
facility_settings (
  id uuid PK,
  name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#1973f0',
  business_hours jsonb,          -- { mon: { open: '06:00', close: '20:00' }, ... }
  booking_advance_notice integer, -- minutes required before session
  cancellation_window integer,    -- minutes before session to allow cancellation
  notification_preferences jsonb, -- { email_on_booking: true, ... }
  created_at, updated_at
)
```

**This will require a Drizzle schema addition + migration.**

### 4.2 Settings API + UI

**API Routes:**

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/settings` | GET | `validateRole('admin')` | Get facility settings |
| `/api/admin/settings` | PATCH | `validateRole('admin')` | Update settings |
| `/api/admin/settings/logo` | POST | `validateRole('admin')` | Upload logo to R2 |

**Module services (`modules/admin/services/settings.ts`):**
- `getSettings(db)` — fetch facility settings row
- `updateSettings(db, updates)` — partial update
- `uploadLogo(key, body, contentType)` — reuse R2 storage pattern from messaging module

**Frontend (`app/admin/settings/`):**
- Branding section: facility name input, logo upload (drag-drop), color picker for `--facility-primary`
- Operations section: business hours grid, advance notice input, cancellation window input
- Notification preferences: toggle switches
- Save button with optimistic UI

**Admin nav update:** Add `{ href: '/admin/settings', iconKey: 'settings', label: 'Settings' }` to admin nav items.

---

## Module Structure (Final)

```
modules/admin/
  index.ts                    # Barrel exports
  config.ts                   # AdminAuthContext, DrizzleInstance
  types/
    index.ts                  # UserListItem, TierInput, RevenueStats, FacilitySettings, etc.
  services/
    users.ts                  # Phase 1: user CRUD, role management
    invitations.ts            # Phase 1: Clerk invitation wrapper
    tiers.ts                  # Phase 2: tier CRUD + Stripe sync
    revenue.ts                # Phase 3: revenue aggregation
    subscriptions.ts          # Phase 3: subscription management + refunds
    settings.ts               # Phase 4: facility settings CRUD

app/admin/
  layout.tsx                  # isAdmin gate (server component)
  page.tsx                    # Dashboard home
  users/page.tsx              # Phase 1
  tiers/page.tsx              # Phase 2
  finances/page.tsx           # Phase 3
  settings/page.tsx           # Phase 4
```

## API Route Summary (All Phases)

All routes under `/api/admin/` use `validateRole('admin')`.

| Phase | Route | Methods |
|-------|-------|---------|
| 1 | `/api/admin/users` | GET |
| 1 | `/api/admin/users/[id]` | GET, PATCH, DELETE |
| 1 | `/api/admin/invitations` | GET, POST |
| 1 | `/api/admin/invitations/[id]` | DELETE |
| 2 | `/api/admin/tiers` | GET, POST |
| 2 | `/api/admin/tiers/[id]` | PATCH, DELETE |
| 3 | `/api/admin/revenue` | GET |
| 3 | `/api/admin/subscriptions/[id]/cancel` | POST |
| 3 | `/api/admin/subscriptions/[id]/pause` | POST |
| 3 | `/api/admin/subscriptions/[id]/resume` | POST |
| 3 | `/api/admin/refunds` | POST |
| 3 | `/api/admin/invoices` | GET |
| 4 | `/api/admin/settings` | GET, PATCH |
| 4 | `/api/admin/settings/logo` | POST |

## Key Files to Modify (Across All Phases)

| File | Change |
|------|--------|
| `components/navigation/GlassSidebar.tsx` | Add admin nav items (role-gated) |
| `components/navigation/Sidebar.tsx` | Add admin nav items (role-gated) |
| `app/api/webhooks/clerk/route.ts` | Handle `intendedRole` metadata on `user.created` |
| `lib/db/schema.ts` | Add `facilitySettings` table (Phase 4) |
| `modules/admin/*` | New module (all phases) |
| `app/admin/*` | New route tree (all phases) |
| `app/api/admin/*` | New API routes (all phases) |

## Reusable Existing Code

| What | Where | Used For |
|------|-------|----------|
| `validateRole('admin')` | `lib/api/auth.ts` | All admin API routes |
| `createApiError()` | `lib/api/errors.ts` | Error responses |
| `validateRequestBody()` | `lib/api/validation.ts` | Zod validation |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | Destructive action confirmation |
| `GlassAppLayout` | `components/layout/GlassAppLayout.tsx` | Admin page layout |
| `uploadToR2()` | `modules/messaging/services/storage.ts` | Logo upload (Phase 4) |
| `stripe` client | `lib/stripe.ts` | All Stripe operations |
| `db` singleton | `lib/db/index.ts` | All DB queries |
| `auditLogs` table | `lib/db/schema.ts` | Audit trail for admin actions |

## Verification

Each phase should be verified by:
1. **Role gate**: Confirm non-admin users are redirected from `/admin` routes
2. **API security**: Confirm all `/api/admin/*` routes return 403 for non-admin users
3. **Desktop-only**: Confirm admin content is hidden on mobile viewports
4. **Stripe sync**: (Phase 2+) Verify tier creation creates Stripe Product/Price, price changes archive old Price
5. **Invite flow**: (Phase 1) Send test invitation, verify signup auto-assigns role
6. **Deployment**: Verify on Vercel preview deployment (no new env vars needed for Phase 1-2, Phase 3 uses existing Stripe keys)
