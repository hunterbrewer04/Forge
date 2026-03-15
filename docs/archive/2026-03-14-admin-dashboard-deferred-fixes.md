# Admin Dashboard — Deferred Fixes & Improvements

Findings from `/simplify` code reviews across all 4 phases. ~~Strikethrough~~ = fixed.

---

## High Priority

### ~~1. Stripe atomicity in `createTier` / `updateTier`~~ FIXED
Wrapped DB insert in try/catch — on failure, deletes the orphaned Stripe product. `updateTier` rolls back price changes on DB failure.

### ~~2. Audit logging on admin mutations~~ FIXED
Added `logAuditEvent()` calls (fire-and-forget) to all 11 admin mutation endpoints. Created `lib/services/audit.ts` utility.

---

## Medium Priority

### ~~3. Slug collision in tier creation/updates~~ FIXED
Added `uniqueSlug()` helper that checks for existing slugs and appends numeric suffix if needed.

### ~~4. `chargeId` validation in refund route~~ FIXED
Added `.startsWith('ch_')` validation to the Zod schema.

### ~~5. Subscription error handling duplication~~ FIXED
Created `SubscriptionNotFoundError` class. All 3 subscription routes now use `instanceof` check instead of string matching.

### ~~6. Revenue service — 4 COUNT queries could be 1~~ FIXED
Collapsed into single query using Postgres `count(*) filter (where ...)` conditional aggregation.

### ~~7. Shared FormModal component~~ FIXED
Extracted `components/admin/FormModal.tsx`. Updated TierFormModal and InviteModal to use it.

### ~~8. Shared ToggleSwitch component~~ FIXED
Extracted `components/ui/ToggleSwitch.tsx`. Updated users and settings pages.

### ~~9. EmptyState component reuse~~ FIXED
Updated `components/ui/EmptyState.tsx` to use CSS-variable theming. Replaced inline empty states in users, tiers, and finances pages.

### ~~10. AdminAuthContext — unused type~~ FIXED
Removed from `modules/admin/config.ts` and barrel exports.

---

## Low Priority

### ~~11. SidebarIcon switch duplication~~ FIXED
Extracted `components/navigation/sidebar-icons.tsx` with shared `SIDEBAR_ICON_MAP` and `SidebarIcon` component. Both sidebars now import from shared file.

### 12. React Query migration for admin pages — DEFERRED
All admin pages use manual `useState` + `useEffect` + `fetch`. Migrating to React Query would eliminate boilerplate but is a larger refactor. Not blocking — manual fetch works correctly.

### ~~13. Shared layout auth helper~~ FIXED
Extracted `lib/api/require-role.ts` with `requireRole('isAdmin' | 'isTrainer')`. Both admin and trainer layouts now use it.

### ~~14. Pagination schema reuse~~ FIXED
Added `CommonSchemas.paginationQuery` with `z.coerce` wrappers. Admin users route now extends it.

### 15. Pagination count re-runs on page change — DEFERRED
Coupled to #12 (React Query). Would need separate query keys for data vs count. Low impact.

### 16. Admin layout renders children on mobile — DEFERRED
Children mount and fetch on mobile despite being hidden via CSS. Low impact since mobile admin access is an edge case and the layout already redirects non-admins.

### ~~17. Loading spinner duplication~~ FIXED
Extracted `components/ui/LoadingSpinner.tsx`. Replaced inline spinners in all 4 admin pages.

### ~~18. `slugify` in shared utils~~ FIXED
Moved to `lib/utils/string.ts`. Tiers service now imports from shared location.

### ~~19. No dirty-state tracking on settings page~~ FIXED
Added `isDirty` computed check. Save button disabled when no changes. Form state re-synced with server response after save. Changed field comparisons to only send actually-changed fields.

### ~~20. `offset` vs `page` state design~~ FIXED
Changed users page to store `page` as canonical state. Offset derived inside `fetchUsers`.

---

## Summary

**Fixed:** 18 of 20 items
**Deferred:** 2 items (#12 React Query migration, #15 pagination count optimization, #16 mobile layout) — low priority, not blocking
