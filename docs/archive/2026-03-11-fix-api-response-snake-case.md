# Fix: API Response snake_case Mapping

**Date:** 2026-03-11
**Branch:** `fix/api-response-snake-case`

## What was fixed

1. **Admin paywall bypass** — Admin accounts were incorrectly redirected to `/member/plans` instead of `/home` after sign-in.
2. **Undefined Stripe pricing** — The paywall page showed `$undefined/mo` instead of actual prices.

## Root cause

Two API routes returned Drizzle ORM query results with **camelCase** keys, but the frontend expects **snake_case**:

- `/api/profile` returned `{ isAdmin, isTrainer, hasFullAccess, ... }` — `MembershipGuard.tsx` checked `profile.is_admin` etc., all `undefined`, so `hasAccess()` always returned `false`.
- `/api/membership-tiers` returned `{ priceMonthly, monthlyBookingQuota, ... }` — `WizardStepPlans.tsx` rendered `tier.price_monthly`, which was `undefined`.

All other API routes already had manual camelCase-to-snake_case mapping. These two were simply missed.

## Files changed

- **`app/api/profile/route.ts`** — Added `formatProfile()` helper for snake_case mapping, used in both GET and PATCH handlers.
- **`app/api/membership-tiers/route.ts`** — Added snake_case mapping with `Number()` coercion for `price_monthly` (handles both DB numeric and Stripe-enriched string values).

## Prevention

When adding new API routes, always map Drizzle results to snake_case before returning. Match the field names in `lib/types/database.ts`.
