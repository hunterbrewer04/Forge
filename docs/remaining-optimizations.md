# Forge App — Remaining Optimizations

Tracking document for work remaining after PR #23 (performance) and PR #24 (security/PWA hardening).

## Critical

- [x] Fix RLS policy roles from `{public}` to `{authenticated}` on conversations, messages, profiles *(migration applied)*
- [ ] Enable leaked password protection *(Supabase dashboard setting — must be toggled manually)*

## High

- [x] Push notifications — full system *(implemented: `push_subscriptions` table, web-push API route, SW push handler, permission flow component, message + booking notification triggers, VAPID env vars)*

## Medium

- [x] Chat optimistic updates *(already implemented — MessageInput creates temp messages, real-time sub replaces them)*
- [x] Signed URL caching for chat media *(added in-memory cache with 45-min TTL to `lib/services/storage.ts`)*
- [x] RLS admin check optimization *(migration applied — `public.is_admin()` SECURITY DEFINER helper replaces subqueries)*
- [x] Audit log cleanup schedule *(migration applied — pg_cron daily at 3 AM UTC)*

## Low

- [x] Rate limiter circuit breaker *(implemented — falls back to in-memory limiter after 3 consecutive Upstash failures, resets after 30s)*
- [x] Replace `Math.random()` with `crypto.randomUUID()` for upload filenames *(fixed in `upload/route.ts` and `storage.ts`)*
- [x] Install prompt timing *(added 30s engagement delay before showing install prompt)*
- [x] Reduce SW update poll interval from 60s to 20min *(fixed in `lib/register-sw.ts`)*

---

## Setup Required for Push Notifications

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to Vercel environment variables:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the public key
   - `VAPID_PRIVATE_KEY` — the private key (server-side only)
   - `VAPID_SUBJECT` — `mailto:your-email@domain.com`
3. Enable leaked password protection in Supabase dashboard: Authentication > Settings > Security
