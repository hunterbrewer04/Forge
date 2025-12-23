# Forge PWA - Comprehensive Overhaul Plan

> **Created:** December 2024
> **Purpose:** Address security vulnerabilities, remove code bloat, fix TypeScript issues, and improve PWA capabilities
> **Estimated Effort:** 3-4 development days

---

## Table of Contents

1. [Phase 1: Critical Security Fixes](#phase-1-critical-security-fixes)
2. [Phase 2: TypeScript "any" Type Elimination](#phase-2-typescript-any-type-elimination)
3. [Phase 3: Code Cleanup & Bloat Removal](#phase-3-code-cleanup--bloat-removal)
4. [Phase 4: Code Refactoring & DRY Principles](#phase-4-code-refactoring--dry-principles)
5. [Phase 5: PWA Enhancements](#phase-5-pwa-enhancements)
6. [Phase 6: Production Hardening](#phase-6-production-hardening)

---

## Phase 1: Critical Security Fixes

**Priority:** CRITICAL
**Estimated Time:** 2-3 hours
**Dependencies:** None

### 1.1 Add Security Headers to Next.js Config

**File:** `next.config.ts`

**Current State:** Empty configuration with no security headers

**Required Headers:**
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

**Why:** Prevents XSS, clickjacking, MIME-sniffing attacks, and enforces HTTPS.

---

### 1.2 Fix Client-Provided User IDs

**Files to Modify:**
- `app/chat/components/MessageInput.tsx`

**Current Problem (Line 110-116, 146-151):**
```typescript
// BAD: senderId comes from props (client-provided)
sender_id: senderId,
```

**Solution:**
```typescript
// GOOD: Get user from authenticated session
import { useAuth } from '@/contexts/AuthContext'

// Inside component:
const { user } = useAuth()

// In insert:
sender_id: user.id,  // Use authenticated user, not prop
```

**Why:** Prevents message spoofing if RLS is misconfigured.

---

### 1.3 Add Server-Side File Validation

**Files to Create/Modify:**
- Create: `app/api/upload/route.ts`
- Modify: `app/chat/components/MessageInput.tsx`

**Implementation:**
1. Create API route that validates files server-side using magic bytes
2. Move upload logic to API route
3. Client sends file to API, API validates and uploads to Supabase Storage

**Validation Requirements:**
- Check magic bytes (not just MIME type)
- Enforce file size limits server-side
- Strip EXIF metadata from images
- Scan for malicious content patterns

---

### 1.4 Verify Supabase Storage Bucket RLS

**Location:** Supabase Dashboard → Storage → Policies

**Required Policies for `chat-media` bucket:**
```sql
-- Policy: Users can upload to their conversations
CREATE POLICY "Users can upload media to their conversations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM conversations
    WHERE client_id = auth.uid() OR trainer_id = auth.uid()
  )
);

-- Policy: Users can view media in their conversations
CREATE POLICY "Users can view media in their conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM conversations
    WHERE client_id = auth.uid() OR trainer_id = auth.uid()
  )
);
```

---

## Phase 2: TypeScript "any" Type Elimination ✅ COMPLETED

**Priority:** HIGH
**Estimated Time:** 1-2 hours
**Dependencies:** None
**Status:** Completed December 2024

### 2.1 Overview of "any" Types to Fix

| File | Line | Current Code | Proper Type |
|------|------|--------------|-------------|
| `components/InstallPrompt.tsx` | 23 | `(window.navigator as any).standalone` | Create interface extending Navigator |
| `app/chat/page.tsx` | 127 | `(data.profiles as any)?.full_name` | Define proper Supabase response type |
| `app/chat/page.tsx` | 183 | `(data.profiles as any)?.full_name` | Define proper Supabase response type |
| `app/home/page.tsx` | 68 | `(conversation.trainer as any)?.full_name` | Define Conversation with relations |
| `app/signup/page.tsx` | 41 | `catch (err: any)` | Use `unknown` with type guard |
| `app/chat/components/ConversationList.tsx` | 51 | `(conv: any)` | Define Conversation type |
| `app/login/components/LoginForm.tsx` | 36 | `catch (err: any)` | Use `unknown` with type guard |
| `app/chat/components/ClientConversationList.tsx` | 55 | `(data.profiles as any)?.full_name` | Define proper response type |
| `app/chat/components/ChatWindow.tsx` | 101 | `(msg: any)` | Define Message type |

---

### 2.2 Create Shared Type Definitions

**File to Create:** `lib/types/database.ts`

```typescript
// Database types based on Supabase schema
export interface Profile {
  id: string
  full_name: string | null
  is_trainer: boolean
  is_client: boolean
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  client_id: string
  trainer_id: string
  created_at: string
  // With relations
  client?: Profile
  trainer?: Profile
  profiles?: Profile  // For foreign key joins
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  media_type: 'image' | 'video' | null
  created_at: string
  // With relations
  sender?: Profile
  profiles?: Profile  // For foreign key joins
}

// Supabase query response types
export interface ConversationWithClient extends Conversation {
  profiles: Profile  // client profile via foreign key
}

export interface ConversationWithTrainer extends Conversation {
  profiles: Profile  // trainer profile via foreign key
}

export interface MessageWithSender extends Message {
  profiles: Profile  // sender profile via foreign key
}
```

---

### 2.3 Create Navigator Extension Type

**File to Create:** `lib/types/navigator.d.ts`

```typescript
// Extend Navigator for iOS standalone detection
interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

declare global {
  interface Window {
    navigator: NavigatorStandalone
  }
}

export {}
```

---

### 2.4 Create Error Handling Utility

**File to Create:** `lib/utils/errors.ts`

```typescript
export interface AppError {
  message: string
  code?: string
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

// Usage in catch blocks:
// catch (err: unknown) {
//   setError(getErrorMessage(err))
// }
```

---

### 2.5 Files to Update (Grouped by Fix Type)

**Group A: Error Handling (catch blocks)**
- `app/signup/page.tsx:41`
- `app/login/components/LoginForm.tsx:36`

**Group B: Supabase Response Types**
- `app/chat/page.tsx:127, 183`
- `app/home/page.tsx:68`
- `app/chat/components/ConversationList.tsx:51`
- `app/chat/components/ClientConversationList.tsx:55`
- `app/chat/components/ChatWindow.tsx:101`

**Group C: Navigator Extension**
- `components/InstallPrompt.tsx:23`

---

## Phase 3: Code Cleanup & Bloat Removal ✅ COMPLETED

**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Dependencies:** None
**Status:** Completed December 2024

### 3.1 Files to Delete

| File | Reason | Size |
|------|--------|------|
| `lib/supabase.ts` | Deprecated, duplicates browser/server clients | 23 lines |
| `public/next.svg` | Unused Next.js logo | ~1KB |
| `public/vercel.svg` | Unused Vercel logo | ~1KB |
| `public/file.svg` | Unused asset | ~1KB |
| `public/globe.svg` | Unused asset | ~1KB |
| `public/window.svg` | Unused asset | ~1KB |

**Command:**
```bash
rm lib/supabase.ts
rm public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

---

### 3.2 Documentation to Archive

**Create archive directory and move files:**

```bash
mkdir -p docs/archived
mv SECURITY-PHASE1-REPORT.md docs/archived/
mv SECURITY-PHASE2-REPORT.md docs/archived/
mv PHASE2-TESTING-GUIDE.md docs/archived/
mv IMPLEMENTATION-SUMMARY.md docs/archived/
mv checklist.txt docs/archived/
```

**Files being archived:**
| File | Lines | Reason |
|------|-------|--------|
| `SECURITY-PHASE1-REPORT.md` | 575 | Post-implementation report, historical |
| `SECURITY-PHASE2-REPORT.md` | 889 | Post-implementation report, historical |
| `PHASE2-TESTING-GUIDE.md` | 714 | Testing docs, consolidate later |
| `IMPLEMENTATION-SUMMARY.md` | 260 | Summary of completed work |
| `checklist.txt` | 503 | Project checklist, completed |

---

### 3.3 Remove Debug Console Logs

**File:** `app/chat/page.tsx`

**Lines to Remove/Modify:**
- Line 32: `console.log('[ChatPage] Component mounted')`
- Lines 37-43: Full auth state logging block
- Line 49, 51, 57: Loading timeout debug logs
- Lines 72-80: Auth redirect debugging
- Lines 86-91, 110, 121, 148-151, 178, 188: Additional debug logs

**Solution:** Create conditional logger utility

**File to Create:** `lib/utils/logger.ts`

```typescript
const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args)
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args)
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  }
}
```

Then replace all `console.log` with `logger.debug` calls.

---

### 3.4 Remove Commented Code

**File:** `app/api/example/route.ts`

**Lines to Remove:**
- Lines 111-131: Commented database operation example (~20 lines)
- Lines 155-184: Commented DELETE endpoint example (~29 lines)

**Action:** Move examples to `docs/api-examples.md` if needed for reference, then delete from source.

---

### 3.5 Remove Unused Exports

**File:** `lib/api/index.ts`

**Exports to evaluate:**
- `validateQueryParams` - Remove if not used
- `sanitizeString` - Remove if not used
- `isValidUUID` - Remove if not used
- `CommonSchemas` - Remove if not used

**Note:** Keep exports that may be used in future API routes. Add `// @future` comment if keeping for planned features.

---

### 3.6 Move Shell Scripts

**Current Location:** Project root
**New Location:** `scripts/`

```bash
mkdir -p scripts
mv pre-commit-security.sh scripts/
mv install-precommit-hook.sh scripts/
```

**Update references in:** `.claude/settings.json` (if applicable)

---

## Phase 4: Code Refactoring & DRY Principles ✅ COMPLETED

**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Dependencies:** Phase 2 (types), Phase 3 (cleanup)
**Status:** Completed December 2024

### 4.1 Extract Conversation Fetching Logic

**Problem:** Conversation fetching is duplicated in 3 files

**Current Locations:**
- `app/chat/page.tsx` (lines 95-117 for clients, 157-168 for trainers)
- `app/chat/components/ConversationList.tsx` (lines 31-47)
- `app/chat/components/ClientConversationList.tsx` (lines 31-50)

**Solution:** Create shared service

**File to Create:** `lib/services/conversations.ts`

```typescript
import { createClient } from '@/lib/supabase-browser'
import type { ConversationWithClient, ConversationWithTrainer } from '@/lib/types/database'

export async function fetchClientConversation(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!conversations_trainer_id_fkey (
        id,
        full_name
      )
    `)
    .eq('client_id', userId)
    .single()

  if (error) throw error
  return data as ConversationWithTrainer
}

export async function fetchTrainerConversations(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!conversations_client_id_fkey (
        id,
        full_name
      )
    `)
    .eq('trainer_id', userId)

  if (error) throw error
  return data as ConversationWithClient[]
}

export async function fetchConversationInfo(conversationId: string, isTrainer: boolean) {
  const supabase = createClient()
  const foreignKey = isTrainer
    ? 'conversations_client_id_fkey'
    : 'conversations_trainer_id_fkey'

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      client_id,
      trainer_id,
      profiles!${foreignKey} (
        id,
        full_name
      )
    `)
    .eq('id', conversationId)
    .single()

  if (error) throw error
  return data
}
```

---

### 4.2 Extract Message Fetching Logic

**File to Create:** `lib/services/messages.ts`

```typescript
import { createClient } from '@/lib/supabase-browser'
import type { MessageWithSender } from '@/lib/types/database'

export async function fetchMessages(conversationId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_id,
      content,
      media_url,
      media_type,
      created_at,
      profiles!messages_sender_id_fkey (
        id,
        full_name
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as MessageWithSender[]
}

export async function sendMessage(params: {
  conversationId: string
  senderId: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
}) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      content: params.content,
      media_url: params.mediaUrl || null,
      media_type: params.mediaType || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

---

### 4.3 Extract Media URL Generation

**File to Create:** `lib/services/storage.ts`

```typescript
import { createClient } from '@/lib/supabase-browser'

const SIGNED_URL_EXPIRY = 3600 // 1 hour

export async function getSignedMediaUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('chat-media')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY)

  if (error) {
    console.error('Error generating signed URL:', error)
    return null
  }

  return data.signedUrl
}

export async function uploadMedia(
  file: File,
  conversationId: string
): Promise<{ path: string; type: 'image' | 'video' } | null> {
  const supabase = createClient()

  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = file.name.split('.').pop()
  const fileName = `${timestamp}-${randomString}.${extension}`
  const filePath = `${conversationId}/${fileName}`

  const { error } = await supabase.storage
    .from('chat-media')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const mediaType = file.type.startsWith('image/') ? 'image' : 'video'
  return { path: filePath, type: mediaType }
}
```

---

### 4.4 Simplify Component Files

After extracting services, update components to use them:

**Components to Refactor:**
| Component | Current Lines | Target Lines | Reduction |
|-----------|---------------|--------------|-----------|
| `app/chat/page.tsx` | 389 | ~200 | ~50% |
| `app/chat/components/ChatWindow.tsx` | 277 | ~150 | ~45% |
| `app/chat/components/MessageInput.tsx` | 253 | ~120 | ~50% |
| `app/chat/components/ConversationList.tsx` | 116 | ~60 | ~50% |
| `app/chat/components/ClientConversationList.tsx` | 114 | ~60 | ~50% |

---

## Phase 5: PWA Enhancements ✅ COMPLETED

**Priority:** LOW-MEDIUM
**Estimated Time:** 3-4 hours
**Dependencies:** None (can be done in parallel)
**Status:** Completed December 2024

### 5.1 Add iOS Splash Screens

**File to Modify:** `app/layout.tsx`

**Add to metadata/head:**
```tsx
// Add apple-touch-startup-image for various iPhone sizes
<link rel="apple-touch-startup-image" href="/splash/iphone5.png" media="(device-width: 320px)" />
<link rel="apple-touch-startup-image" href="/splash/iphone6.png" media="(device-width: 375px)" />
<link rel="apple-touch-startup-image" href="/splash/iphoneplus.png" media="(device-width: 414px)" />
<link rel="apple-touch-startup-image" href="/splash/iphonex.png" media="(device-width: 375px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image" href="/splash/iphonexr.png" media="(device-width: 414px) and (-webkit-device-pixel-ratio: 2)" />
<link rel="apple-touch-startup-image" href="/splash/iphonexsmax.png" media="(device-width: 414px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image" href="/splash/ipad.png" media="(device-width: 768px)" />
```

**Files to Create:** Generate splash screen PNGs in `/public/splash/`

---

### 5.2 Add PNG Icon Fallbacks

**Files to Create:**
- `public/icon-192x192.png`
- `public/icon-512x512.png`
- `public/apple-touch-icon.png` (180x180)

**Update:** `public/manifest.json`
```json
{
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-192x192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "maskable"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

---

### 5.3 Add Service Worker Update Notification

**File to Modify:** `lib/register-sw.ts`

```typescript
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Check for updates periodically
      setInterval(() => {
        registration.update()
      }, 60 * 1000)

      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available - dispatch custom event
            window.dispatchEvent(new CustomEvent('swUpdate', { detail: registration }))
          }
        })
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  })
}
```

**File to Create:** `components/UpdatePrompt.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handleUpdate = (event: CustomEvent<ServiceWorkerRegistration>) => {
      setRegistration(event.detail)
      setShowUpdate(true)
    }

    window.addEventListener('swUpdate', handleUpdate as EventListener)
    return () => window.removeEventListener('swUpdate', handleUpdate as EventListener)
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <p className="font-medium">A new version is available!</p>
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleUpdate}
          className="px-4 py-2 bg-white text-blue-600 rounded font-medium"
        >
          Update Now
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="px-4 py-2 bg-blue-700 rounded"
        >
          Later
        </button>
      </div>
    </div>
  )
}
```

---

### 5.4 Enhance Manifest.json

**File:** `public/manifest.json`

**Add missing fields:**
```json
{
  "name": "Forge Trainer",
  "short_name": "Forge",
  "description": "Connect trainers with clients for real-time messaging and support",
  "start_url": "/home",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "categories": ["health", "fitness", "lifestyle"],
  "screenshots": [
    {
      "src": "/screenshots/chat.png",
      "sizes": "1080x1920",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "shortcuts": [
    {
      "name": "Messages",
      "url": "/chat",
      "icons": [{ "src": "/icons/chat.png", "sizes": "96x96" }]
    }
  ],
  "icons": [...]
}
```

---

## Phase 6: Production Hardening ✅ COMPLETED

**Priority:** LOW
**Estimated Time:** 2-3 hours
**Dependencies:** Phases 1-4
**Status:** Completed December 2024

### 6.1 Upgrade Rate Limiting for Production

**Install Dependencies:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**File to Modify:** `lib/api/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Create rate limiters for different endpoints
export const rateLimiters = {
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  }),
  messaging: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
  }),
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
  }),
}
```

**Environment Variables to Add:**
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

### 6.2 Add Password Strength Requirements

**File:** `app/signup/page.tsx`

**Add validation:**
```typescript
const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}
```

**Add password confirmation field to form.**

---

### 6.3 Add Audit Logging

**File to Create:** `lib/services/audit.ts`

```typescript
import { createAdminClient } from '@/lib/supabase-admin'

export async function logAuditEvent(params: {
  userId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = createAdminClient()

  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    resource: params.resource,
    resource_id: params.resourceId,
    metadata: params.metadata,
    ip_address: null, // Set from request
    user_agent: null, // Set from request
    created_at: new Date().toISOString(),
  })
}
```

**Requires:** Create `audit_logs` table in Supabase

---

## Execution Checklist

### Phase 1: Critical Security Fixes
- [ ] Add security headers to `next.config.ts`
- [ ] Fix client-provided user IDs in `MessageInput.tsx`
- [ ] Create server-side file validation API route
- [ ] Verify Supabase storage bucket RLS policies

### Phase 2: TypeScript "any" Elimination ✅
- [x] Create `lib/types/database.ts` with shared types
- [x] Create `lib/types/navigator.d.ts` for iOS detection
- [x] Create `lib/utils/errors.ts` for error handling
- [x] Update error catches to use `unknown` + type guard
- [x] Update Supabase queries to use proper types
- [x] Fix Navigator standalone detection type

### Phase 3: Code Cleanup ✅
- [x] Delete `lib/supabase.ts`
- [x] Delete unused SVG files from `/public/`
- [x] Create `docs/archived/` and move reports
- [x] Remove debug console.log statements
- [x] Create `lib/utils/logger.ts`
- [x] Remove commented code from API example
- [x] Move shell scripts to `scripts/` directory

### Phase 4: Code Refactoring ✅
- [x] Create `lib/services/conversations.ts`
- [x] Create `lib/services/messages.ts`
- [x] Create `lib/services/storage.ts`
- [x] Refactor `ChatWindow.tsx` to use services
- [x] Refactor `MessageInput.tsx` to use services
- [x] Refactor `ConversationList.tsx` to use services
- [x] Refactor `ClientConversationList.tsx` to use services
- [x] Simplify `app/chat/page.tsx`

### Phase 5: PWA Enhancements ✅
- [x] Generate iOS splash screens
- [x] Create PNG icon fallbacks
- [x] Add apple-touch-icon
- [x] Implement service worker update notification
- [x] Create `UpdatePrompt.tsx` component
- [x] Enhance `manifest.json` with categories/screenshots

### Phase 6: Production Hardening ✅
- [x] Set up Upstash Redis support
- [x] Upgrade rate limiting implementation
- [x] Add password strength validation
- [x] Add password confirmation field
- [x] Create audit logging table migration
- [x] Implement audit logging service

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `lib/types/database.ts` | Shared database types |
| `lib/types/navigator.d.ts` | Navigator type extension |
| `lib/utils/errors.ts` | Error handling utilities |
| `lib/utils/logger.ts` | Conditional logging |
| `lib/services/conversations.ts` | Conversation fetching |
| `lib/services/messages.ts` | Message operations |
| `lib/services/storage.ts` | Media storage operations |
| `lib/services/audit.ts` | Audit logging |
| `docs/migrations/create_audit_logs.sql` | Audit logs table migration |
| `app/api/upload/route.ts` | Server-side file validation |
| `components/UpdatePrompt.tsx` | SW update notification |
| `docs/archived/` | Archive directory |
| `scripts/` | Shell scripts directory |

### Files to Delete
| File | Reason |
|------|--------|
| `lib/supabase.ts` | Deprecated |
| `public/next.svg` | Unused |
| `public/vercel.svg` | Unused |
| `public/file.svg` | Unused |
| `public/globe.svg` | Unused |
| `public/window.svg` | Unused |

### Files to Move
| From | To |
|------|-----|
| `SECURITY-PHASE1-REPORT.md` | `docs/archived/` |
| `SECURITY-PHASE2-REPORT.md` | `docs/archived/` |
| `PHASE2-TESTING-GUIDE.md` | `docs/archived/` |
| `IMPLEMENTATION-SUMMARY.md` | `docs/archived/` |
| `checklist.txt` | `docs/archived/` |
| `pre-commit-security.sh` | `scripts/` |
| `install-precommit-hook.sh` | `scripts/` |

### Files to Modify
| File | Changes |
|------|---------|
| `next.config.ts` | Add security headers |
| `app/chat/components/MessageInput.tsx` | Use auth context, remove any |
| `app/chat/components/ChatWindow.tsx` | Use services, remove any |
| `app/chat/components/ConversationList.tsx` | Use services, remove any |
| `app/chat/components/ClientConversationList.tsx` | Use services, remove any |
| `app/chat/page.tsx` | Use services, remove console.logs, remove any |
| `app/home/page.tsx` | Remove any types |
| `app/signup/page.tsx` | Remove any, add password validation |
| `app/login/components/LoginForm.tsx` | Remove any type |
| `components/InstallPrompt.tsx` | Fix Navigator type |
| `lib/register-sw.ts` | Add update detection |
| `lib/api/rate-limit.ts` | Upgrade for production |
| `public/manifest.json` | Add categories, screenshots, PNG icons |
| `app/layout.tsx` | Add splash screen links |

---

## Notes

- **Phases can be worked in parallel** where dependencies allow
- **Phase 1 is critical** and should be completed first
- **Phase 2 and 3** can be done together as they're both cleanup tasks
- **Phase 4** depends on Phase 2 for types
- **Phase 5** is independent and can be done anytime
- **Phase 6** should be done before production deployment

---

*Document Version: 1.0*
*Last Updated: December 2024*
