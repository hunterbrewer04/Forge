# Branch Status

Last updated: 2026-03-11

## Active Integration Branch

**`feature/drizzle-orm-migration`** — Contains all Phase 1 + Phase 2 work (20 commits ahead of `main`).

This is the integration branch for all pre-production work. Phase 3 will branch off of this, and when ready, this branch merges → `main` for production.

---

## Phase 1 — Clerk Auth Migration (Complete)

**What was done:** Replaced Supabase Auth with Clerk across the entire app.

**Commits:** `e29923c`..`2287a46` (18 commits)

**Key changes:**
- ClerkProvider wrapping the app, AuthContext rewrite to use Clerk sessions
- All ~25 API routes updated to use `validateAuth()` / `validateRole()` with Clerk
- Clerk webhook handler for user sync (`app/api/webhooks/clerk/`)
- CSP updates for Clerk domains
- RLS disabled on all Supabase tables (auth now handled at app layer)
- Supabase client reduced to Realtime + Storage only

**Plan doc:** `docs/plans/2026-03-06-clerk-auth-migration.md`

---

## Phase 2 — Drizzle ORM Migration (Complete)

**What was done:** Replaced all Supabase JS client database queries with Drizzle ORM. Ported 5 Postgres RPCs to TypeScript query helpers.

**Commits:** `0f78178` (main migration) + `8085d72` (env var alignment)

**Key changes:**
- `lib/db/schema.ts` — 9 table definitions with relations
- `lib/db/index.ts` — Drizzle client singleton (server-only)
- `lib/db/types.ts` — Inferred select/insert types from schema
- `lib/db/queries/` — Complex query helpers (bookings transaction, session availability, calendar tokens)
- All ~25 API routes migrated from `supabase.from()` to Drizzle queries
- Env vars aligned: `DATABASE_URL` → `POSTGRES_URL`, `DATABASE_URL_DIRECT` → `POSTGRES_URL_NON_POOLING`

**Architecture doc:** `docs/forge-architecture-vision.md`

---

## Branching Strategy

```
main (production)
 └── feature/drizzle-orm-migration (Phase 1 + Phase 2)
      └── feature/phase-3-* (Phase 3 branches off here)
           └── merges back → feature/drizzle-orm-migration
                └── merges → main when ready for production
```

- **Phase 3** (Calendar/Booking Module) gets its own branch off `feature/drizzle-orm-migration`
- When Phase 3 is complete, merge back into `feature/drizzle-orm-migration`
- When ready for production, merge `feature/drizzle-orm-migration` → `main`

---

## Deleted Branches

| Branch | Reason | Date |
|--------|--------|------|
| `feature/clerk-auth-migration` | All 18 commits exist on `feature/drizzle-orm-migration` with identical SHAs | 2026-03-11 |
| `feature/desktop-glass-redesign` | Merged via PR #58 | 2026-03-11 |
