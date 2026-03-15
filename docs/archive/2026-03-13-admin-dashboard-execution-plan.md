# Admin Dashboard Module — Execution Plan

## Context

Forge has no admin panel. The `isAdmin` flag exists in `profiles` but is unused. This plan builds `modules/admin/` following the same DI-based pattern as `modules/calendar-booking/` and `modules/messaging/`. Full vision doc saved at `docs/plans/2026-03-13-admin-dashboard-module.md`.

**Primary user:** Facility owner/admin (desktop only)
**Access:** `profiles.isAdmin === true`
**Layout:** Reuses `GlassAppLayout` with admin nav in `GlassSidebar`

---

## Execution Strategy — Skills, Sub-Agents & MCPs

### Skills to invoke at key points:

| Skill | When |
|-------|------|
| `superpowers:executing-plans` | At start of execution — orchestrates the phased implementation |
| `superpowers:dispatching-parallel-agents` | Within each phase — parallelize independent file creation |
| `superpowers:brainstorming` | Before each frontend page — explore UI design before building |
| `frontend-design:frontend-design` | For each admin page (`users/`, `tiers/`, `finances/`, `settings/`) |
| `stripe:stripe-best-practices` | Before Phase 2 (tiers) and Phase 3 (subscriptions/refunds) |
| `/simplify` | **After completing each phase** — review all changed code for quality |
| `superpowers:verification-before-completion` | Before claiming any phase is done |
| `superpowers:requesting-code-review` | After all 4 phases complete, before merge |
| `superpowers:finishing-a-development-branch` | Final step — merge/PR decision |

### Sub-Agents to use:

| Agent Type | Purpose |
|------------|---------|
| `fullstack-developer` | Primary implementation agent — services, API routes, pages |
| `typescript-pro` | Module type definitions (`config.ts`, `types/index.ts`) — ensure strict DI types |
| `frontend-developer` | Admin page components — data tables, modals, forms |
| `ui-designer` | Desktop admin layout, data table styling, card grids |
| `superpowers:code-reviewer` | Review after each phase completes |
| `code-simplifier:code-simplifier` | Runs as part of `/simplify` after each phase |

### MCPs to use:

| MCP Tool | When |
|----------|------|
| `mcp__claude_ai_Clerk__clerk_sdk_snippet` | Phase 1 — get correct Clerk invitation API snippets |
| `mcp__claude_ai_Clerk__list_clerk_sdk_snippets` | Phase 1 — discover available Clerk SDK patterns |
| `context7:resolve-library-id` + `query-docs` | Look up Drizzle ORM, Stripe, Next.js 16, Clerk docs as needed |
| `mcp__claude_ai_Vercel__list_deployments` | Verify deployment after each phase |
| `mcp__claude_ai_Vercel__get_deployment_build_logs` | Debug any build failures |

---

## Phase 0 — Setup

- [x] Save plan to `docs/plans/2026-03-13-admin-dashboard-module.md` (already done)
- [x] Save execution plan to `docs/plans/2026-03-13-admin-dashboard-execution-plan.md`
- [x] Create feature branch: `git checkout -b feature/admin-dashboard` from `main`

---

## Phase 1 — Foundation + User Management

### 1.1 Module Scaffold (parallelize with sub-agents)

**Dispatch 3 agents in parallel:**

**Agent A — Module types + config** (`typescript-pro`):
- `modules/admin/config.ts` — `AdminAuthContext { userId, profileId, isAdmin }`, re-export `DrizzleInstance`
- `modules/admin/types/index.ts` — `UserListItem`, `UserDetail`, `InviteInput`, `RoleUpdate`, pagination types
- `modules/admin/index.ts` — barrel exports
- **Pattern to follow:** `modules/calendar-booking/config.ts` (line-for-line structure)

**Agent B — Services** (`fullstack-developer`):
- `modules/admin/services/users.ts`:
  - `listUsers(db, filters)` — paginated, searchable by name/email, filterable by role
  - `getUser(db, userId)` — profile + membership tier via `db.query.profiles.findFirst({ with: { membershipTier: true } })`
  - `updateUserRoles(db, userId, roleUpdates)` — toggle `isTrainer`, `isMember`, `hasFullAccess`, `isAdmin`
  - `deactivateUser(db, userId)` — soft deactivate flag
- `modules/admin/services/invitations.ts`:
  - `sendInvitation(emailAddress, options?)` — wraps `clerkClient.invitations.createInvitation()`
  - `listInvitations()` — wraps `clerkClient.invitations.getInvitationList()`
  - `revokeInvitation(invitationId)` — wraps `clerkClient.invitations.revokeInvitation()`
- **Use MCP:** `mcp__claude_ai_Clerk__clerk_sdk_snippet` for invitation API patterns
- **Pattern to follow:** `modules/calendar-booking/services/bookings.ts` (DI via `db` first param)

**Agent C — API Routes** (`fullstack-developer`):
- `app/api/admin/users/route.ts` — GET with filters/pagination
- `app/api/admin/users/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/admin/invitations/route.ts` — GET, POST
- `app/api/admin/invitations/[id]/route.ts` — DELETE (revoke)
- **Pattern to follow:** existing API routes use `validateRole()` → check `instanceof NextResponse` → call service

### 1.2 Admin Route + Layout Gate

- `app/admin/layout.tsx` — server component, mirrors `app/trainer/layout.tsx`:
  - `auth()` → Drizzle lookup → check `isAdmin` → redirect `/home` if not
  - Add CSS breakpoint gate for desktop-only (hide content below `lg` breakpoint)
- `app/admin/page.tsx` — redirect to `/admin/users`

### 1.3 Navigation Updates

Modify both sidebar components:
- `components/navigation/GlassSidebar.tsx` — add admin nav items gated by `profile?.is_admin`
- `components/navigation/Sidebar.tsx` — same pattern
- Add `'users'` to `IconKey` type union + icon switch case (use `Users` from lucide-react)

### 1.4 Frontend — Users Page

- **Invoke skill:** `superpowers:brainstorming` → then `frontend-design:frontend-design`
- `app/admin/users/page.tsx` — desktop data table, search, role filter, invite modal, user detail slide-out
- Reuse: `ConfirmModal`, `GlassAppLayout`

### 1.5 Clerk Webhook Update

- `app/api/webhooks/clerk/route.ts` — in `user.created` handler:
  - Check `evt.data.public_metadata?.intendedRole`
  - If present, set corresponding profile flag on insert

### 1.6 Phase 1 Completion

- [ ] Run `/simplify` — review all Phase 1 code for reuse, quality, efficiency
- [ ] Run `superpowers:verification-before-completion` — verify role gate, API security, desktop-only
- [ ] Commit: `feat: add admin module foundation + user management (Phase 1)`

---

## Phase 2 — Membership Tier Management

### 2.1 Pre-Implementation

- **Invoke skill:** `stripe:stripe-best-practices` — review Stripe Product/Price patterns
- **Use MCP:** `context7:query-docs` for Stripe API (products, prices, immutable pricing)

### 2.2 Tier Service

- `modules/admin/services/tiers.ts`:
  - `listTiers(db)` — all tiers + subscriber count via subquery
  - `createTier(db, input)` — DB insert + `stripe.products.create()` + `stripe.prices.create()`
  - `updateTier(db, tierId, updates)` — if price changes: new Stripe Price, archive old
  - `toggleTierVisibility(db, tierId, isActive)` — toggle flag
  - `archiveTier(db, tierId)` — guard against active subscribers, archive Stripe Price
- Add types to `modules/admin/types/index.ts`: `TierInput`, `TierUpdate`, `TierListItem`
- Update `modules/admin/index.ts` exports

### 2.3 API Routes

- `app/api/admin/tiers/route.ts` — GET, POST
- `app/api/admin/tiers/[id]/route.ts` — PATCH, DELETE

### 2.4 Frontend — Tiers Page

- **Invoke skill:** `superpowers:brainstorming` → then `frontend-design:frontend-design`
- `app/admin/tiers/page.tsx` — card grid, create/edit modals, visibility toggle, archive warning
- Add `'tiers'` to sidebar nav (use `CreditCard` or `Layers` icon from lucide-react)

### 2.5 Phase 2 Completion

- [ ] Run `/simplify` — review all Phase 2 code for reuse, quality, efficiency
- [ ] Run `superpowers:verification-before-completion` — verify Stripe sync, tier CRUD
- [ ] Commit: `feat: add membership tier management with Stripe sync (Phase 2)`

---

## Phase 3 — Financial Management

### 3.1 Pre-Implementation

- **Invoke skill:** `stripe:stripe-best-practices` — subscription lifecycle, refunds, invoices
- **Use MCP:** `context7:query-docs` for Stripe subscription pause/cancel/refund APIs

### 3.2 Revenue + Subscription Services

**Dispatch 2 agents in parallel:**

**Agent A** — `modules/admin/services/revenue.ts`:
  - `getRevenueStats(db)` — MRR, active subs count, member/trainer counts, new this month
  - Uses Drizzle aggregates + `stripe.balanceTransactions.list()` for revenue

**Agent B** — `modules/admin/services/subscriptions.ts`:
  - `cancelSubscription(db, profileId, options)` — immediate or end-of-period
  - `pauseSubscription(db, profileId)` — `pause_collection: { behavior: 'void' }`
  - `resumeSubscription(db, profileId)` — clear `pause_collection`
  - `issueRefund(chargeId, amount?)` — `stripe.refunds.create()`
  - `listInvoices(filters)` — `stripe.invoices.list()` with pagination

### 3.3 API Routes

- `app/api/admin/revenue/route.ts` — GET
- `app/api/admin/subscriptions/[id]/cancel/route.ts` — POST
- `app/api/admin/subscriptions/[id]/pause/route.ts` — POST
- `app/api/admin/subscriptions/[id]/resume/route.ts` — POST
- `app/api/admin/refunds/route.ts` — POST
- `app/api/admin/invoices/route.ts` — GET

### 3.4 Frontend — Finances Page

- **Invoke skill:** `superpowers:brainstorming` → then `frontend-design:frontend-design`
- `app/admin/finances/page.tsx` — dashboard cards (MRR, subs, revenue), subscription table, invoice table, refund flow
- Add `'finances'` to sidebar nav (use `DollarSign` or `TrendingUp` from lucide-react)

### 3.5 Phase 3 Completion

- [ ] Run `/simplify` — review all Phase 3 code for reuse, quality, efficiency
- [ ] Run `superpowers:verification-before-completion` — verify Stripe operations work
- [ ] Commit: `feat: add financial management dashboard (Phase 3)`

---

## Phase 4 — Facility Settings

### 4.1 Schema Migration

- **Use MCP:** `context7:query-docs` for Drizzle ORM migration/schema patterns
- Add `facilitySettings` table to `lib/db/schema.ts`:
  - `id`, `name`, `logoUrl`, `primaryColor`, `businessHours` (jsonb), `bookingAdvanceNotice`, `cancellationWindow`, `notificationPreferences` (jsonb), `createdAt`, `updatedAt`
- Add relations to schema
- Generate migration: `npx drizzle-kit generate`

### 4.2 Settings Service

- `modules/admin/services/settings.ts`:
  - `getSettings(db)` — fetch single facility settings row
  - `updateSettings(db, updates)` — partial update with `updatedAt` timestamp
  - `uploadLogo(key, body, contentType)` — reuse `uploadToR2()` from `modules/messaging/services/storage.ts`

### 4.3 API Routes

- `app/api/admin/settings/route.ts` — GET, PATCH
- `app/api/admin/settings/logo/route.ts` — POST (multipart upload)

### 4.4 Frontend — Settings Page

- **Invoke skill:** `superpowers:brainstorming` → then `frontend-design:frontend-design`
- `app/admin/settings/page.tsx` — branding (name, logo upload, color picker), operations (hours, notice, cancellation window), notification toggles
- Add `'settings'` to sidebar nav (use `Settings` from lucide-react)

### 4.5 Phase 4 Completion

- [ ] Run `/simplify` — review all Phase 4 code for reuse, quality, efficiency
- [ ] Run `superpowers:verification-before-completion` — verify settings CRUD, logo upload, theme application
- [ ] Commit: `feat: add facility settings management (Phase 4)`

---

## Final Completion

- [ ] Run `superpowers:requesting-code-review` — full review of all 4 phases
- [ ] Run `superpowers:finishing-a-development-branch` — merge/PR decision
- [ ] Verify deployment via `mcp__claude_ai_Vercel__list_deployments`

---

## Critical Files Reference

### Existing files to modify:
- `components/navigation/GlassSidebar.tsx` — add admin nav items
- `components/navigation/Sidebar.tsx` — add admin nav items
- `app/api/webhooks/clerk/route.ts` — handle `intendedRole` on `user.created`
- `lib/db/schema.ts` — add `facilitySettings` table (Phase 4 only)

### Patterns to replicate:
- `modules/calendar-booking/config.ts` → `modules/admin/config.ts`
- `modules/calendar-booking/index.ts` → `modules/admin/index.ts`
- `app/trainer/layout.tsx` → `app/admin/layout.tsx` (role gate)
- `lib/api/auth.ts:validateRole('admin')` → all API routes

### Reusable code:
- `validateRole('admin')` — `lib/api/auth.ts`
- `createApiError()` — `lib/api/errors.ts`
- `validateRequestBody()` — `lib/api/validation.ts`
- `ConfirmModal` — `components/ui/ConfirmModal.tsx`
- `GlassAppLayout` — `components/layout/GlassAppLayout.tsx`
- `uploadToR2()` — `modules/messaging/services/storage.ts`
- `stripe` singleton — `lib/stripe.ts`
- `db` singleton — `lib/db/index.ts`

## Verification Checklist (each phase)

1. Role gate: non-admin users redirected from `/admin` routes
2. API security: all `/api/admin/*` routes return 403 for non-admin
3. Desktop-only: admin content hidden on mobile viewports
4. Stripe sync: (Phase 2+) tier creates Stripe Product/Price correctly
5. `/simplify` passes with no issues after each phase
