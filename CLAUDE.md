# Forge Sports Performance — Project Context

Forge is a PWA for sports performance training — a trainer-client platform with messaging, session bookings, and payments. Hosted on Vercel (frontend) + Supabase (Postgres host, Realtime, Storage) with Clerk (auth) and Drizzle ORM (database queries).

## Important: Do NOT Build Locally

- No `.env` file in the repo — env vars are configured in Vercel/Supabase dashboards
- `npm run build` will fail without env vars — do not attempt
- `npm run dev` requires env vars — do not attempt without them
- All deployments happen via Vercel

## Commands (for reference only)

- `npm run dev` — local dev server (requires `.env.local`)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run start` — serve production build

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- **Drizzle ORM** + `postgres` driver — all database queries
- Supabase (Postgres host, Realtime subscriptions, Storage) — NOT used for queries anymore
- Clerk (authentication)
- TanStack React Query v5 (client-side data fetching/caching)
- Tailwind CSS v4 (PostCSS plugin, CSS-variable-based theming)
- Zod (API request validation)
- Stripe (payments, subscriptions)
- web-push (push notifications via VAPID)
- Lucide React (icons), Sonner (toasts)
- PWA: service worker (`public/sw.js`), manifest, offline support

## Architecture

```
app/                    # Next.js App Router pages
  trainer/              # Trainer routes (sessions, settings, clients — role-gated via layout)
  api/                  # API routes (bookings, sessions, calendar, conversations, clients, push, upload)
  chat/                 # Messaging UI (role-based: trainer sees all, client sees one)
  home/                 # Dashboard
  member/               # Signup/login
  payments/             # Payment management
  profile/              # User profile
  schedule/             # Session booking with calendar
components/
  layout/               # AppLayout, MobileLayout, ChatLayout
  navigation/           # BottomNav, TopBar, Sidebar
  skeletons/            # Loading skeleton components
  ui/                   # ConfirmModal, EmptyState, Toast, icons
contexts/
  AuthContext.tsx        # Global auth state (Clerk), profile, session management
  FacilityThemeContext.tsx  # Light/dark/system theme, facility branding
lib/
  api/                  # API utilities (auth, rate-limit, validation, errors)
  db/                   # Drizzle ORM layer
    schema.ts           # Table definitions + relations (9 tables)
    index.ts            # Drizzle client singleton (server-only)
    types.ts            # Inferred select/insert types from schema
    queries/            # Complex query helpers (bookings, sessions, calendar)
  hooks/                # useHomeData, usePullToRefresh, useScheduleData, useUnreadCount, useToast
  services/             # Client-side fetch wrappers (bookings, sessions, messages, conversations, etc.)
  types/                # API response types (database.ts, sessions.ts)
  utils/                # date, errors, haptics, logger
  supabase-browser.ts   # Client-side Supabase (Realtime + Storage ONLY)
  supabase-admin.ts     # Server-side Supabase (Storage uploads ONLY)
drizzle.config.ts       # Drizzle Kit config (for introspection/migrations)
public/
  sw.js                 # Service worker (cache v8)
  manifest.json         # PWA manifest
```

## Key Patterns

- **Path alias**: `@/*` maps to project root
- **Server vs client**: Pages are server components by default; `'use client'` for interactive components
- **Database**: All DB queries use Drizzle ORM (`lib/db/index.ts`). Schema at `lib/db/schema.ts`. Column names are camelCase in Drizzle, snake_case in the actual Postgres columns.
- **Auth**: Clerk for authentication. `AuthContext` wraps the app. API routes use `validateAuth()` / `validateRole()` from `lib/api/auth.ts`.
- **Roles**: `profiles` table has `isTrainer`, `isAdmin`, `isMember`, `hasFullAccess` flags
- **Data fetching**: React Query for client-side; Drizzle queries in server components/API routes
- **Client services**: `lib/services/*.ts` are fetch wrappers to API routes — no direct DB access from the browser
- **Realtime**: Supabase Realtime subscriptions for new messages and unread counts (migrates to Ably in Phase 4)
- **Storage**: Supabase Storage for chat media and avatars (migrates to R2 in Phase 4)
- **API security**: Rate limiting, Zod validation, auth middleware, audit logging

## Design System

- White-label ready: `--facility-primary` CSS variable (currently `#1973f0`)
- Light mode default, dark mode via `.dark` class
- Fonts: Lexend (display), Manrope (body), Geist (code)
- Safe area insets for iOS notch/home indicator
- Mobile-first: 375px–428px primary viewport

## PWA Notes

- Service worker caches static assets, images, and navigation
- Supabase API calls and `/api/*` routes are never cached
- SW clears dynamic cache on sign-out (prevents stale auth pages)
- Push notifications via VAPID/web-push
- Install/update/notification prompts with smart timing and dismissal

## Gotchas

- Service worker (`sw.js`) must be updated manually (bump cache version)
- `lib/db/index.ts` uses `'server-only'` import — will error if imported in client code
- `supabase-admin.ts` is Storage-only — do NOT use for DB queries (use `lib/db` instead)
- Env validation runs on server startup — will throw if required vars missing
- CSS uses `@theme inline` (Tailwind v4 syntax) — not compatible with Tailwind v3
- No `middleware.ts` — auth protection happens in layouts and API route helpers
- Drizzle schema uses camelCase (`trainerId`), Postgres columns are snake_case (`trainer_id`). API responses use snake_case for frontend compatibility.
