# Forge Sports Performance — Project Context

Forge is a PWA for sports performance training — a trainer-client platform with messaging, session bookings, and payments. Hosted on Vercel (frontend) + Supabase (backend/auth/db/storage).

## Important: Do NOT Build Locally

- No `.env` file in the repo — env vars are configured in Vercel/Supabase dashboards
- `npm run build` will fail without env vars — do not attempt
- `npm run dev` requires env vars — do not attempt without them
- All deployments happen via Vercel

## Commands (for reference only)

- `npm run dev` — local dev server (requires `.env.local` with Supabase credentials)
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run start` — serve production build

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Supabase (auth, Postgres DB, storage, realtime subscriptions, RLS)
- TanStack React Query v5 (client-side data fetching/caching)
- Tailwind CSS v4 (PostCSS plugin, CSS-variable-based theming)
- Zod (API request validation)
- web-push (push notifications via VAPID)
- Lucide React (icons), Sonner (toasts)
- PWA: service worker (`public/sw.js`), manifest, offline support

## Architecture

```
app/                    # Next.js App Router pages
  trainer/              # Trainer routes (sessions, settings, clients — role-gated via layout)
  api/                  # API routes (bookings, sessions, calendar, push, upload)
  chat/                 # Messaging UI (role-based: trainer sees all, client sees one)
  home/                 # Dashboard
  login/ signup/        # Auth pages
  payments/             # Payment management
  profile/              # User profile
  schedule/             # Session booking with calendar
components/
  layout/               # AppLayout, MobileLayout, ChatLayout
  navigation/           # BottomNav, TopBar, Sidebar
  skeletons/            # Loading skeleton components
  ui/                   # ConfirmModal, EmptyState, Toast, icons
contexts/
  AuthContext.tsx        # Global auth state, profile, session management
  FacilityThemeContext.tsx  # Light/dark/system theme, facility branding
lib/
  api/                  # API utilities (auth, rate-limit, validation, errors)
  hooks/                # useHomeData, usePullToRefresh, useScheduleData, useUnreadCount, useToast
  services/             # Business logic (bookings, sessions, messages, conversations, etc.)
  types/                # TypeScript types (database.ts, sessions.ts)
  utils/                # date, errors, haptics, logger
  supabase-browser.ts   # Client-side Supabase (RLS-protected)
  supabase-server.ts    # Server-side Supabase (cookie-based auth)
  supabase-admin.ts     # Admin Supabase (service role, server-only)
public/
  sw.js                 # Service worker (cache v8)
  manifest.json         # PWA manifest
```

## Key Patterns

- **Path alias**: `@/*` maps to project root
- **Server vs client**: Pages are server components by default; `'use client'` for interactive components
- **Supabase clients**: 3 variants (browser/server/admin) — never use admin client on client-side
- **Auth**: `AuthContext` provides `user`, `profile`, `loading`, `signOut` — wraps entire app
- **Roles**: `profiles` table has `is_trainer`, `is_admin`, `is_client` flags — admin layout checks server-side
- **FK join handling**: Supabase returns FK joins as arrays sometimes — services normalize to objects
- **Data fetching**: React Query for client-side; direct Supabase calls in server components/API routes
- **Realtime**: Supabase Realtime subscriptions for new messages and unread counts
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

- Supabase FK joins can return `array | object | null` — always check with `Array.isArray()`
- Service worker (`sw.js`) must be updated manually (bump cache version)
- `supabase-admin.ts` uses `'server-only'` import — will error if imported in client code
- Env validation runs on server startup — will throw if required vars missing
- CSS uses `@theme inline` (Tailwind v4 syntax) — not compatible with Tailwind v3
- No `middleware.ts` — auth protection happens in layouts and API route helpers
