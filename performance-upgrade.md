# Forge PWA Performance Remediation Plan

**Document Version:** 1.1
**Created:** December 24, 2024
**Status:** Phase 1 Complete - Phase 2 Ready for Implementation
**Estimated Total Time:** 8-12 hours across 4 phases

---

## Executive Summary

This document outlines a systematic plan to resolve 15 identified performance issues causing loading delays and poor perceived performance in the Forge PWA. Issues range from critical bugs (infinite re-fetch loops, duplicate queries) to UX improvements (loading states, skeleton loaders) to architectural optimizations (caching, parallel fetching).

**Current User Experience Issues:**
- Login feels slow (duplicate profile fetch adds 200ms)
- Page transitions show blank screens (no loading states)
- Conversation clicks trigger unnecessary refetches (150ms delay)
- Chat page takes ~700ms to load (sequential waterfall)
- Messages don't appear immediately when sent (100-200ms delay)

**Target Outcomes:**
- Sub-100ms perceived login time
- Instant page transitions with proper loading states
- Zero unnecessary database queries
- Chat loads in <300ms
- Messages appear immediately (optimistic updates)

---

## Issue Inventory

### Critical Issues (Fix Immediately)

| # | Issue | Location | Impact | Severity | Fix Time |
|---|-------|----------|--------|----------|----------|
| 1 | Duplicate profile fetch after login | `contexts/AuthContext.tsx:124,159` | +200ms login delay | CRITICAL | 15 min |
| 2 | Supabase client in useEffect dependencies | `app/home/page.tsx:111`, `app/profile/page.tsx:52` | Infinite re-fetch loops | CRITICAL | 10 min |
| 3 | selectedConversationId triggers full refetch | `app/chat/components/ConversationList.tsx:67` | +150ms per click | HIGH | 5 min |

### High Priority Issues

| # | Issue | Location | Impact | Severity | Fix Time |
|---|-------|----------|--------|----------|----------|
| 4 | Missing loading.tsx files | `app/home/`, `app/chat/`, `app/profile/`, `app/schedule/` | Blank screens during nav | HIGH | 30 min |
| 5 | No skeleton loaders | Entire codebase | Poor loading UX | HIGH | 1 hour |
| 6 | Sequential data waterfall in chat | `app/chat/page.tsx` | +400ms chat load time | HIGH | 45 min |

### Medium Priority Issues

| # | Issue | Location | Impact | Severity | Fix Time |
|---|-------|----------|--------|----------|----------|
| 7 | Redundant profile fetch | `contexts/AuthContext.tsx`, `app/profile/page.tsx` | +150ms profile load | MEDIUM | 15 min |
| 8 | Missing error states | `ChatWindow.tsx`, `ConversationList.tsx` | Silent failures | MEDIUM | 30 min |
| 9 | Per-message sender profile fetch | `app/chat/components/ChatWindow.tsx:106` | O(n) real-time queries | MEDIUM | 20 min |
| 10 | No optimistic updates for messages | `app/chat/components/MessageInput.tsx:157-164` | +150ms perceived delay | MEDIUM | 30 min |
| 11 | No React Query/SWR caching | `lib/services/*` | No deduplication/cache | MEDIUM | 2 hours |
| 12 | Missing memoization | `app/chat/components/ConversationList.tsx:69-74` | Unnecessary re-renders | LOW | 10 min |

### Low Priority Issues

| # | Issue | Location | Impact | Severity | Fix Time |
|---|-------|----------|--------|----------|----------|
| 13 | No route prefetching | Entire app | Slower perceived nav | LOW | 15 min |
| 14 | Service worker could prefetch routes | `public/sw.js` | Missed cache optimization | LOW | 30 min |
| 15 | router in useEffect dependencies | `app/chat/page.tsx:74` | Potential instability | LOW | 5 min |

---

## Detailed Issue Analysis

### Issue #1: Duplicate Profile Fetch After Login

**Current Code (`contexts/AuthContext.tsx`):**
```typescript
// Lines 124-130: First fetch in getSession()
const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await fetchProfile(session.user.id)  // ❌ First fetch
  }
  setLoading(false)
}

// Lines 159-165: Second fetch in onAuthStateChange
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await fetchProfile(session.user.id)  // ❌ Duplicate fetch!
    }
  }
)
```

**Problem:** Profile is fetched twice on every login, adding 150-200ms of unnecessary latency and causing an extra re-render.

**Solution:** Add a ref flag to track if profile has been fetched and skip duplicate fetches.

---

### Issue #2: Supabase Client in useEffect Dependencies

**Current Code (`app/home/page.tsx:111`):**
```typescript
const supabase = createClient()  // ❌ New instance every render

useEffect(() => {
  fetchStats()
}, [user, profile, supabase])  // ❌ supabase changes every render → infinite loop
```

**Same pattern in:** `app/profile/page.tsx:52`

**Problem:** Creating the Supabase client outside useEffect and including it in dependencies causes the effect to run on every render, creating infinite re-fetch loops.

**Solution:** Either create the client inside the effect or memoize it with `useMemo()`.

---

### Issue #3: selectedConversationId Triggers Full Refetch

**Current Code (`app/chat/components/ConversationList.tsx:67`):**
```typescript
useEffect(() => {
  const loadConversations = async () => {
    const data = await fetchTrainerConversations(currentUserId)
    setConversations(data)
  }
  loadConversations()
}, [currentUserId, selectedConversationId])  // ❌ selectedConversationId shouldn't be here
```

**Problem:** Every time a user clicks a conversation (changing `selectedConversationId`), the entire conversation list is refetched from the database. This is unnecessary since the list hasn't changed.

**Solution:** Remove `selectedConversationId` from dependencies array.

---

### Issue #4: Missing loading.tsx Files

**Current State:** No `loading.tsx` files in:
- `/app/home/`
- `/app/chat/`
- `/app/profile/`
- `/app/schedule/`

**Problem:** Next.js 14 App Router supports automatic loading UI via `loading.tsx` files, but none exist. Users see blank or flickering screens during navigation.

**Solution:** Create `loading.tsx` in each route directory with skeleton UI matching the page layout.

---

### Issue #5: No Skeleton Loaders

**Current State:** Zero skeleton loader components in the codebase. All loading states show either:
- "Loading..." text
- Blank screens
- Nothing at all

**Problem:** Users perceive apps with skeleton loaders as significantly faster, even when actual load times are the same.

**Solution:** Create reusable skeleton components for:
- Messages
- Conversations
- Stats cards
- Profile sections

---

### Issue #6: Sequential Data Waterfall in Chat Page

**Current Flow (`app/chat/page.tsx`):**
```
1. AuthContext fetches profile (150ms)
     ↓
2. useEffect waits for profile, then fetches conversation (150ms)
     ↓
3. Conversation details fetch (150ms)
     ↓
4. Messages fetch (150ms)
     ↓
5. Media URL generation (100ms)
     ↓
Total: ~700ms sequential wait time
```

**Problem:** Data that could be fetched in parallel is being fetched sequentially, creating a 4-level waterfall.

**Solution:** Use `Promise.all()` to parallelize independent fetches.

---

### Issue #7: Redundant Profile Fetch

**Current Code:**
```typescript
// contexts/AuthContext.tsx:54-58 - Already fetches:
.select('id, full_name, avatar_url, is_trainer, is_admin, is_client')

// app/profile/page.tsx:40-44 - Fetches again:
.select('avatar_url, created_at')  // ❌ avatar_url is duplicate
```

**Problem:** `avatar_url` is fetched twice, wasting a database query.

**Solution:** Add `created_at` to the AuthContext profile query and remove the redundant fetch from profile page.

---

### Issue #8: Missing Error States

**Current Pattern (multiple files):**
```typescript
try {
  const data = await fetchMessages(conversationId)
  setMessages(data)
} catch (err) {
  logger.error('Error fetching messages:', err)  // ❌ No UI feedback
}
```

**Problem:** Errors are logged but users see nothing. They don't know if the app is broken, loading, or what happened.

**Solution:** Add error state variables and display error UI with retry options.

---

### Issue #9: Per-Message Sender Profile Fetch

**Current Code (`app/chat/components/ChatWindow.tsx:106`):**
```typescript
// Real-time subscription handler
const senderProfile = await fetchSenderProfile(payload.new.sender_id)
```

**Problem:** For every new real-time message, the app makes a separate database query to fetch the sender's profile. This is O(n) queries where n = number of messages.

**Solution:** Implement a sender profile cache using `useRef(new Map())`.

---

### Issue #10: No Optimistic Updates for Messages

**Current Code (`app/chat/components/MessageInput.tsx:157-164`):**
```typescript
const { error } = await supabase.from('messages').insert({
  content: message,
  conversation_id: conversationId,
  sender_id: user.id,
})

if (!error) {
  setMessage('')  // ❌ Only clears after server confirms
}
```

**Problem:** User doesn't see their message until the server responds (100-200ms delay). The input field doesn't clear immediately either.

**Solution:** Show the message optimistically, then replace with server-confirmed version.

---

### Issue #11: No React Query/SWR for Caching

**Current State:** All data fetching uses manual `useEffect` + `useState` patterns with no:
- Request deduplication
- Background refetching
- Cache invalidation
- Optimistic updates
- Automatic retry logic

**Problem:** Inefficient data management, inconsistent patterns, no caching between navigations.

**Solution:** Consider implementing React Query or SWR for automatic caching and request management.

---

### Issue #12: Missing Memoization in ConversationList

**Current Code (`app/chat/components/ConversationList.tsx:69-74`):**
```typescript
// ❌ These run on EVERY render
const filteredConversations = conversations.filter(conv =>
  conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
)
const pinnedConversations = filteredConversations.filter(c => c.is_pinned)
const recentConversations = filteredConversations.filter(c => !c.is_pinned)
```

**Problem:** Array filtering operations run on every render, even when `conversations` and `searchQuery` haven't changed.

**Solution:** Wrap filtering logic in `useMemo()`.

---

## Phase-by-Phase Implementation Plan

---

## PHASE 1: CRITICAL FIXES (< 1 Hour)

**Goal:** Fix bugs causing immediate performance problems and infinite loops  
**Estimated Time:** 45 minutes  
**Priority:** CRITICAL - Do this immediately

### Tasks

#### Task 1.1: Remove Supabase from useEffect Dependencies (10 min)

**Files to modify:**
- `app/home/page.tsx`
- `app/profile/page.tsx`

**Implementation:**

```typescript
// BEFORE (app/home/page.tsx:111)
const supabase = createClient()

useEffect(() => {
  fetchStats()
}, [user, profile, supabase])  // ❌ BAD

// AFTER - Option 1: Create inside effect
useEffect(() => {
  const supabase = createClient()
  fetchStats()
}, [user, profile])  // ✅ GOOD

// AFTER - Option 2: Memoize client
const supabase = useMemo(() => createClient(), [])

useEffect(() => {
  fetchStats()
}, [user, profile, supabase])  // ✅ GOOD (supabase is now stable)
```

**Apply same fix to:**
- `app/profile/page.tsx:52`

**Testing:**
1. Open React DevTools Profiler
2. Navigate to /home and /profile
3. Verify effects only run once per dependency change
4. Check Network tab - should see no repeated requests

---

#### Task 1.2: Remove selectedConversationId from Dependencies (5 min)

**File:** `app/chat/components/ConversationList.tsx:67`

**Implementation:**

```typescript
// BEFORE
useEffect(() => {
  const loadConversations = async () => {
    const data = await fetchTrainerConversations(currentUserId)
    setConversations(data)
  }
  loadConversations()
}, [currentUserId, selectedConversationId])  // ❌ BAD

// AFTER
useEffect(() => {
  const loadConversations = async () => {
    const data = await fetchTrainerConversations(currentUserId)
    setConversations(data)
  }
  loadConversations()
}, [currentUserId])  // ✅ GOOD
```

**Testing:**
1. Load chat page with conversations
2. Click between different conversations
3. Open Network tab - should see NO new queries to conversations table
4. Verify conversations still display correctly

---

#### Task 1.3: Add Duplicate Profile Fetch Guard (15 min)

**File:** `contexts/AuthContext.tsx`

**Implementation:**

```typescript
// ADD at top of AuthProvider component
const profileFetched = useRef(false)

// MODIFY getSession function (around line 124)
const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session?.user && !profileFetched.current) {
    profileFetched.current = true
    await fetchProfile(session.user.id)
  }
  
  setLoading(false)
}

// MODIFY onAuthStateChange handler (around line 159)
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && 
        session?.user && 
        !profileFetched.current) {
      profileFetched.current = true
      await fetchProfile(session.user.id)
    }
    
    if (event === 'SIGNED_OUT') {
      profileFetched.current = false  // Reset on logout
      setProfile(null)
    }
  }
)
```

**Testing:**
1. Open Network tab
2. Log in to the app
3. Count profile fetches - should be exactly 1, not 2
4. Log out and log back in
5. Verify profile still loads correctly

---

#### Task 1.4: Consolidate Profile Queries (15 min)

**Files to modify:**
- `contexts/AuthContext.tsx:54-58`
- `app/profile/page.tsx:40-44`

**Implementation:**

```typescript
// MODIFY contexts/AuthContext.tsx fetchProfile function
const fetchProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, is_trainer, is_admin, is_client, created_at')  // ✅ Added created_at
      .eq('id', userId)
      .single()

    if (error) throw error
    setProfile(data)
  } catch (error) {
    logger.error('Error fetching profile:', error)
  }
}

// MODIFY app/profile/page.tsx - Remove this entire useEffect:
// ❌ DELETE THIS:
useEffect(() => {
  if (!user) return

  const fetchExtendedProfile = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, created_at')
      .eq('id', user.id)
      .single()

    if (error) {
      logger.error('Error fetching extended profile:', error)
      return
    }

    setExtendedProfile(data)
  }

  fetchExtendedProfile()
}, [user])

// ✅ REPLACE WITH: Just use profile from AuthContext
// The profile from context now includes created_at
```

**Testing:**
1. Navigate to /profile
2. Open Network tab
3. Should see NO additional profile query (only the one from AuthContext)
4. Verify profile page still shows created_at correctly

---

### Phase 1 Validation Checklist

Phase 1 completed on December 24, 2024:

- [x] No infinite loops in /home or /profile (check React DevTools)
- [x] Clicking conversations doesn't refetch conversation list
- [x] Login only fetches profile once (check Network tab)
- [x] Profile page doesn't make redundant query
- [x] All existing functionality still works
- [x] No console errors
- [x] Commit changes with message: `fix: resolve critical performance issues (Phase 1)`

**Expected Performance Gains:**
- Login: -200ms (one profile fetch instead of two)
- Home/Profile: Eliminates infinite re-fetch loops
- Conversation clicks: -150ms per click (no unnecessary refetch)
- Profile page: -150ms (no redundant query)

---

## PHASE 2: LOADING UX (1-2 Hours)

**Goal:** Add proper loading states so the app feels instant even during data fetches  
**Estimated Time:** 1.5-2 hours  
**Priority:** HIGH - Dramatically improves perceived performance

### Tasks

#### Task 2.1: Create Skeleton Components (1 hour)

**Create new directory:** `components/skeletons/`

**Files to create:**

**1. `components/skeletons/MessageSkeleton.tsx`**
```typescript
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse mb-4">
      <div className="w-10 h-10 rounded-full bg-stone-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-stone-700 rounded w-1/4" />
        <div className="h-16 bg-stone-700 rounded" />
      </div>
    </div>
  )
}

export function MessageListSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  )
}
```

**2. `components/skeletons/ConversationSkeleton.tsx`**
```typescript
export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse border-b border-stone-800">
      <div className="w-12 h-12 rounded-full bg-stone-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-stone-700 rounded w-3/4" />
        <div className="h-3 bg-stone-700 rounded w-1/2" />
      </div>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div>
      {[...Array(8)].map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  )
}
```

**3. `components/skeletons/StatsCardSkeleton.tsx`**
```typescript
export function StatsCardSkeleton() {
  return (
    <div className="bg-stone-800 rounded-xl p-6 animate-pulse">
      <div className="h-4 bg-stone-700 rounded w-1/3 mb-4" />
      <div className="h-8 bg-stone-700 rounded w-1/2 mb-2" />
      <div className="h-3 bg-stone-700 rounded w-2/3" />
    </div>
  )
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

**4. `components/skeletons/ProfileSkeleton.tsx`**
```typescript
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background-dark p-4 animate-pulse">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-stone-700" />
          <div className="h-6 bg-stone-700 rounded w-48" />
        </div>
        
        {/* Info cards */}
        <div className="space-y-4">
          <div className="h-20 bg-stone-800 rounded-xl" />
          <div className="h-20 bg-stone-800 rounded-xl" />
          <div className="h-32 bg-stone-800 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
```

**5. `components/skeletons/index.ts`**
```typescript
export * from './MessageSkeleton'
export * from './ConversationSkeleton'
export * from './StatsCardSkeleton'
export * from './ProfileSkeleton'
```

---

#### Task 2.2: Create loading.tsx Files (30 min)

**1. `app/home/loading.tsx`**
```typescript
import { StatsGridSkeleton } from '@/components/skeletons'

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background-dark p-4">
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="h-8 bg-stone-800 rounded w-48 mb-6" />
        
        {/* Quick actions */}
        <div className="h-32 bg-stone-800 rounded-2xl" />
        
        {/* Stats grid */}
        <StatsGridSkeleton />
        
        {/* Recent activity */}
        <div className="space-y-3">
          <div className="h-6 bg-stone-800 rounded w-32" />
          <div className="h-24 bg-stone-800 rounded-xl" />
          <div className="h-24 bg-stone-800 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
```

**2. `app/chat/loading.tsx`**
```typescript
import { ConversationListSkeleton, MessageListSkeleton } from '@/components/skeletons'

export default function ChatLoading() {
  return (
    <div className="flex h-screen bg-background-dark">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-stone-800">
        <div className="p-4 border-b border-stone-800">
          <div className="h-10 bg-stone-700 rounded animate-pulse" />
        </div>
        <ConversationListSkeleton />
      </div>
      
      {/* Chat window skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-stone-800 animate-pulse">
          <div className="h-6 bg-stone-700 rounded w-48" />
        </div>
        <MessageListSkeleton />
      </div>
    </div>
  )
}
```

**3. `app/profile/loading.tsx`**
```typescript
import { ProfileSkeleton } from '@/components/skeletons'

export default function ProfileLoading() {
  return <ProfileSkeleton />
}
```

**4. `app/schedule/loading.tsx`**
```typescript
export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-background-dark p-4">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-stone-800 rounded w-48" />
        <div className="h-64 bg-stone-800 rounded-2xl" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

#### Task 2.3: Add Error States to Components (30 min)

**Files to modify:**
- `app/chat/components/ChatWindow.tsx`
- `app/chat/components/ConversationList.tsx`
- `app/chat/components/ClientConversationList.tsx`

**Pattern to implement:**

```typescript
// Add error state
const [error, setError] = useState<string | null>(null)

// Modify fetch logic
try {
  setError(null)  // Clear previous errors
  const data = await fetchMessages(conversationId)
  setMessages(data)
} catch (err) {
  logger.error('Error fetching messages:', err)
  setError('Failed to load messages. Tap to retry.')  // ✅ Set user-facing error
}

// Add retry function
const retry = () => {
  setError(null)
  fetchMessages(conversationId)  // Retry the failed operation
}

// Add error UI in render
if (error) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-stone-800 rounded-lg transition-colors"
      onClick={retry}
    >
      <div className="text-red-400 mb-2">⚠️</div>
      <div className="text-stone-300 mb-1">{error}</div>
      <div className="text-stone-500 text-sm">Tap to retry</div>
    </div>
  )
}
```

**Apply this pattern to:**
1. `ChatWindow.tsx` - Message fetching
2. `ConversationList.tsx` - Conversation list fetching
3. `ClientConversationList.tsx` - Client conversation fetching

---

### Phase 2 Validation Checklist

Before moving to Phase 3, verify:

- [ ] Navigating to /home shows skeleton instead of blank screen
- [ ] Navigating to /chat shows conversation + message skeletons
- [ ] Navigating to /profile shows profile skeleton
- [ ] All skeletons animate smoothly
- [ ] Error states display when data fetching fails
- [ ] Retry functionality works when clicking error messages
- [ ] No layout shift when real content replaces skeletons
- [ ] Commit changes with message: `feat: add loading states and error handling (Phase 2)`

**Expected UX Improvements:**
- App feels instant even during loads
- Users always have visual feedback
- Errors are visible and recoverable
- No more blank screens or "Loading..." text

---

## PHASE 3: PERFORMANCE OPTIMIZATIONS (2-4 Hours)

**Goal:** Eliminate unnecessary queries and add real performance improvements  
**Estimated Time:** 2.5-3.5 hours  
**Priority:** HIGH - Measurable speed improvements

### Tasks

#### Task 3.1: Parallelize Chat Page Data Fetching (45 min)

**File:** `app/chat/page.tsx`

**Current Sequential Flow:**
```typescript
// ❌ BAD: Sequential waterfall
useEffect(() => {
  if (!user || !profile) return
  
  // Step 1: Fetch conversation (150ms)
  const conversation = await fetchClientConversation(user.id)
  setConversationInfo(conversation)
  
  // Step 2: Then fetch messages (150ms)
  if (conversation?.id) {
    const messages = await fetchMessages(conversation.id)
    setMessages(messages)
  }
}, [user, profile])
```

**Improved Parallel Approach:**
```typescript
// ✅ GOOD: Parallel fetching
useEffect(() => {
  if (!user || !profile) return
  
  const loadChatData = async () => {
    try {
      // Fetch conversation and check for existing messages in parallel
      const [conversation, hasMessages] = await Promise.all([
        fetchClientConversation(user.id),
        checkHasMessages(user.id)  // Quick count query
      ])
      
      setConversationInfo(conversation)
      
      // If conversation exists, fetch messages
      if (conversation?.id) {
        const messages = await fetchMessages(conversation.id)
        setMessages(messages)
      }
    } catch (error) {
      logger.error('Error loading chat data:', error)
      setError('Failed to load chat. Tap to retry.')
    }
  }
  
  loadChatData()
}, [user?.id, profile?.is_client])  // More specific dependencies
```

**Additional optimization - Prefetch first conversation:**
```typescript
// For trainers viewing client list
const preloadFirstConversation = async () => {
  const conversations = await fetchTrainerConversations(user.id)
  if (conversations.length > 0) {
    // Prefetch the first conversation's messages
    const firstConvMessages = fetchMessages(conversations[0].id)
    return { conversations, firstConvMessages }
  }
  return { conversations, firstConvMessages: null }
}

// Use in parallel:
const [userData, convData] = await Promise.all([
  fetchUserProfile(user.id),
  preloadFirstConversation()
])
```

**Testing:**
1. Open Network tab with throttling (Fast 3G)
2. Navigate to /chat
3. Measure time from navigation to full render
4. Should be ~300-400ms faster than before

---

#### Task 3.2: Implement Sender Profile Caching (20 min)

**File:** `app/chat/components/ChatWindow.tsx`

**Current Code:**
```typescript
// ❌ BAD: Fetches profile for every real-time message
const handleRealtimeMessage = async (payload: any) => {
  const senderProfile = await fetchSenderProfile(payload.new.sender_id)
  // Use senderProfile...
}
```

**Improved with Caching:**
```typescript
// ✅ GOOD: Cache sender profiles
const senderProfileCache = useRef<Map<string, Profile>>(new Map())

const getSenderProfile = async (senderId: string): Promise<Profile> => {
  // Check cache first
  if (senderProfileCache.current.has(senderId)) {
    return senderProfileCache.current.get(senderId)!
  }
  
  // Fetch if not in cache
  const profile = await fetchSenderProfile(senderId)
  senderProfileCache.current.set(senderId, profile)
  return profile
}

const handleRealtimeMessage = async (payload: any) => {
  const senderProfile = await getSenderProfile(payload.new.sender_id)
  // Use senderProfile...
}

// Clear cache on conversation change
useEffect(() => {
  senderProfileCache.current.clear()
}, [conversationId])
```

**Testing:**
1. Open a conversation
2. Have someone send multiple messages
3. Check Network tab - should only see ONE profile query per unique sender
4. Not one per message

---

#### Task 3.3: Add Optimistic Message Updates (30 min)

**File:** `app/chat/components/MessageInput.tsx`

**Current Code:**
```typescript
// ❌ BAD: Wait for server before showing message
const handleSend = async () => {
  const { error } = await supabase
    .from('messages')
    .insert({
      content: message,
      conversation_id: conversationId,
      sender_id: user.id,
    })
  
  if (!error) {
    setMessage('')  // Only clears after server confirms
  }
}
```

**Improved with Optimistic Updates:**
```typescript
// ✅ GOOD: Show immediately, sync with server
const handleSend = async () => {
  if (!message.trim()) return
  
  const messageContent = message.trim()
  const tempId = `temp-${Date.now()}-${Math.random()}`
  
  // Create optimistic message
  const optimisticMessage = {
    id: tempId,
    content: messageContent,
    conversation_id: conversationId,
    sender_id: user.id,
    created_at: new Date().toISOString(),
    pending: true,  // Flag to show loading indicator
  }
  
  // Show immediately
  setMessages(prev => [...prev, optimisticMessage])
  setMessage('')  // Clear input right away
  
  try {
    // Send to server
    const { data, error } = await supabase
      .from('messages')
      .insert({
        content: messageContent,
        conversation_id: conversationId,
        sender_id: user.id,
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Replace optimistic message with real one
    setMessages(prev => prev.map(msg =>
      msg.id === tempId ? { ...data, pending: false } : msg
    ))
    
  } catch (error) {
    logger.error('Failed to send message:', error)
    
    // Remove optimistic message and restore to input
    setMessages(prev => prev.filter(msg => msg.id !== tempId))
    setMessage(messageContent)
    
    // Show error
    alert('Failed to send message. Please try again.')
  }
}
```

**Update message rendering to show pending state:**
```typescript
// In ChatWindow.tsx or wherever messages render
<div className={`message ${msg.pending ? 'opacity-70' : ''}`}>
  {msg.content}
  {msg.pending && (
    <span className="text-xs text-stone-500 ml-2">Sending...</span>
  )}
</div>
```

**Testing:**
1. Send a message
2. Message should appear instantly in the chat
3. Input should clear immediately
4. "Sending..." indicator should show briefly
5. Message should update to final state when confirmed

---

#### Task 3.4: Add Memoization to ConversationList (10 min)

**File:** `app/chat/components/ConversationList.tsx`

**Current Code:**
```typescript
// ❌ BAD: Runs on every render
const filteredConversations = conversations.filter(conv =>
  conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
)
const pinnedConversations = filteredConversations.filter(c => c.is_pinned)
const recentConversations = filteredConversations.filter(c => !c.is_pinned)
```

**Improved with Memoization:**
```typescript
// ✅ GOOD: Only runs when dependencies change
const { filtered, pinned, recent } = useMemo(() => {
  const filtered = conversations.filter(conv =>
    conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return {
    filtered,
    pinned: filtered.filter(c => c.is_pinned),
    recent: filtered.filter(c => !c.is_pinned),
  }
}, [conversations, searchQuery])

// Use in render:
return (
  <>
    {pinned.map(conv => <ConversationItem key={conv.id} {...conv} />)}
    {recent.map(conv => <ConversationItem key={conv.id} {...conv} />)}
  </>
)
```

**Testing:**
1. Open React DevTools Profiler
2. Type in search box
3. Verify filtering only recalculates when search or conversations change
4. Not on every render

---

#### Task 3.5: Remove router from Dependencies (5 min)

**File:** `app/chat/page.tsx:74`

**Current Code:**
```typescript
}, [user, profile, loading, router])  // ❌ router may not be stable
```

**Improved:**
```typescript
}, [user, profile, loading])  // ✅ Remove router

// If you need to call router methods, do it in event handlers, not effects
const handleNavigation = () => {
  router.push('/somewhere')
}
```

---

### Phase 3 Validation Checklist

Before moving to Phase 4, verify:

- [ ] Chat page loads 300-400ms faster (use Network tab with throttling)
- [ ] Real-time messages only fetch sender profile once per sender
- [ ] Sent messages appear instantly in chat
- [ ] Search filtering doesn't cause unnecessary re-renders
- [ ] No router-related re-render issues
- [ ] All optimistic updates handle errors gracefully
- [ ] Commit changes with message: `perf: optimize data fetching and rendering (Phase 3)`

**Expected Performance Gains:**
- Chat page: -400ms (parallel fetching)
- Real-time messages: O(1) profile fetches instead of O(n)
- Message sending: Feels instant (optimistic updates)
- Conversation search: Fewer wasted renders

---

## PHASE 4: ARCHITECTURAL IMPROVEMENTS (Optional, 4+ Hours)

**Goal:** Long-term improvements for maintainability and performance  
**Estimated Time:** 4-6 hours  
**Priority:** MEDIUM - Nice to have, but not urgent

### Task 4.1: Implement React Query (2 hours)

**Why React Query:**
- Automatic caching
- Request deduplication
- Background refetching
- Optimistic updates built-in
- Consistent patterns across codebase

**Installation:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Setup:**

**1. Create `app/providers.tsx`:**
```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

**2. Wrap app in `app/layout.tsx`:**
```typescript
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
```

**3. Create query hooks in `lib/hooks/useConversations.ts`:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrainerConversations, createConversation } from '@/lib/services/conversations'

export function useConversations(userId: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => fetchTrainerConversations(userId),
    enabled: !!userId,
  })
}

export function useCreateConversation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createConversation,
    onSuccess: (data, variables) => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ['conversations', variables.trainerId] })
    },
  })
}
```

**4. Replace useEffect patterns:**
```typescript
// BEFORE
const [conversations, setConversations] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  const load = async () => {
    const data = await fetchTrainerConversations(userId)
    setConversations(data)
    setLoading(false)
  }
  load()
}, [userId])

// AFTER
const { data: conversations, isLoading } = useConversations(userId)
```

**Create similar hooks for:**
- `useMessages(conversationId)`
- `useSendMessage()`
- `useProfile(userId)`
- `useConversationDetails(conversationId)`

---

### Task 4.2: Add Route Prefetching (15 min)

**File:** `components/navigation/BottomNav.tsx` (or wherever nav is)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function BottomNav() {
  const router = useRouter()
  
  // Prefetch likely destinations on mount
  useEffect(() => {
    router.prefetch('/home')
    router.prefetch('/chat')
    router.prefetch('/profile')
    router.prefetch('/schedule')
  }, [router])
  
  return (
    <nav>
      {/* Navigation items */}
    </nav>
  )
}
```

**Also prefetch on hover:**
```typescript
<Link 
  href="/chat"
  onMouseEnter={() => router.prefetch('/chat')}
>
  Chat
</Link>
```

---

### Task 4.3: Enhance Service Worker Caching (30 min)

**File:** `public/sw.js`

**Add route precaching:**
```javascript
// Add to install event
const ROUTE_CACHE = 'route-cache-v1'
const ROUTES_TO_PRECACHE = [
  '/',
  '/home',
  '/chat',
  '/profile',
  '/schedule',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Existing static cache
      caches.open(STATIC_CACHE).then(cache => 
        cache.addAll(STATIC_ASSETS)
      ),
      // Add route precaching
      caches.open(ROUTE_CACHE).then(cache =>
        cache.addAll(ROUTES_TO_PRECACHE)
      ),
    ])
  )
})

// Update fetch handler to serve from route cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // For navigation requests, try cache first
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
    )
    return
  }
  
  // Existing fetch logic...
})
```

---

### Task 4.4: Evaluate Server Components (2+ hours)

**Goal:** Move data fetching to server where possible

**Candidates for Server Components:**
- `/home/page.tsx` - Stats could be server-rendered
- `/profile/page.tsx` - Profile data could be server-rendered
- `/schedule/page.tsx` - Schedule could be server-rendered

**Example conversion for `/home/page.tsx`:**

```typescript
// BEFORE: Client component with useEffect
'use client'

export default function HomePage() {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    fetchStats().then(setStats)
  }, [])
  
  return <StatsDisplay stats={stats} />
}

// AFTER: Server component with direct fetch
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createClient()
  const stats = await fetchStats(supabase)
  
  return <StatsDisplay stats={stats} />
}
```

**Benefits:**
- No loading state needed (loads on server)
- Better SEO
- Smaller client bundle
- Faster initial render

**Considerations:**
- Need to split interactive parts into client components
- Real-time features still need client-side subscriptions
- More complex architecture

---

### Phase 4 Validation Checklist

If implementing Phase 4:

- [ ] React Query DevTools accessible in development
- [ ] All data fetching uses React Query hooks
- [ ] Routes prefetch on navigation hover
- [ ] Service worker precaches critical routes
- [ ] Server components render without client-side fetching
- [ ] No regressions in existing functionality
- [ ] Commit changes with message: `feat: implement React Query and advanced caching (Phase 4)`

**Expected Benefits:**
- Automatic request deduplication
- Persistent cache across navigations
- Background refetching
- Instant route transitions (prefetching)
- Better offline support

---

## Testing Strategy

### After Each Phase

**1. Manual Testing:**
- Test all affected user flows
- Verify no visual regressions
- Check error states work correctly
- Test on mobile and desktop

**2. Performance Testing:**
- Use Chrome DevTools Performance tab
- Record page load with 3G throttling
- Compare before/after metrics
- Check for unnecessary re-renders

**3. Network Analysis:**
- Open Network tab during testing
- Count number of queries
- Verify no duplicate requests
- Check request timing (sequential vs parallel)

**4. Console Monitoring:**
- Check for new errors
- Verify no infinite loops
- Watch for memory leaks

### Before Production Deploy

- [ ] Test all user flows end-to-end
- [ ] Verify auth flow works (login, logout, session persistence)
- [ ] Test real-time messaging
- [ ] Check all loading states display correctly
- [ ] Verify error states are recoverable
- [ ] Test on slow network (3G throttling)
- [ ] Test on mobile device
- [ ] Check browser console for errors
- [ ] Review Network tab for efficiency
- [ ] Verify service worker updates correctly

---

## Rollback Plan

If issues arise after deploying a phase:

**1. Git Revert:**
```bash
# Revert last commit
git revert HEAD

# Or revert specific commit
git revert <commit-hash>

# Push to trigger Vercel redeploy
git push origin main
```

**2. Vercel Rollback:**
- Go to Vercel dashboard
- Navigate to project deployments
- Click previous working deployment
- Click "Promote to Production"

**3. Quick Fixes:**
If issue is minor and identifiable:
- Fix in new commit
- Deploy immediately
- Don't let broken code sit in production

---

## Performance Metrics to Track

**Before Starting:**
Measure baseline performance:
- Login to first meaningful paint: ___ms
- Home page load time: ___ms
- Chat page load time: ___ms
- Conversation click response time: ___ms
- Message send perceived time: ___ms

**After Each Phase:**
Re-measure and document improvements

**Tools:**
- Chrome DevTools Performance tab
- Lighthouse performance score
- React DevTools Profiler
- Network tab with throttling

---

## Success Criteria

### Phase 1 Success:
- ✅ No infinite re-fetch loops
- ✅ Profile fetched exactly once per login
- ✅ Conversation clicks don't trigger list refetch
- ✅ No redundant database queries

### Phase 2 Success:
- ✅ All routes show loading skeletons
- ✅ No blank screens during navigation
- ✅ Errors are visible and recoverable
- ✅ App feels responsive even when loading

### Phase 3 Success:
- ✅ Chat loads 300-400ms faster
- ✅ Messages appear instantly when sent
- ✅ Real-time updates efficient (cached profiles)
- ✅ No unnecessary re-renders

### Phase 4 Success (if implemented):
- ✅ Data cached between navigations
- ✅ Requests deduplicated automatically
- ✅ Routes prefetch on hover
- ✅ Consistent data fetching patterns

---

## Notes for Implementation

**Working with Claude Code:**

When ready to implement each phase, provide Claude Code with this document and specify which phase to execute:

```
Please implement Phase 1 of the Performance Remediation Plan (FORGE_PERFORMANCE_REMEDIATION_PLAN.md). 

Follow the exact steps outlined in the Phase 1 section:
- Task 1.1: Remove Supabase from useEffect dependencies
- Task 1.2: Remove selectedConversationId from dependencies  
- Task 1.3: Add duplicate profile fetch guard
- Task 1.4: Consolidate profile queries

Run all validation checks before marking complete.
```

**After each phase:**
1. Test on Vercel deployment
2. Verify validation checklist
3. Commit with proper message
4. Document any issues or deviations
5. Move to next phase only if current phase is stable

**If you encounter issues:**
1. Document the specific error
2. Check if it's related to recent changes
3. Review the rollback plan section
4. Consider reverting and approaching differently

---

## Maintenance

After completing all phases:

**1. Add Performance Budget:**
Create `.lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3500}],
        "speed-index": ["error", {"maxNumericValue": 3000}]
      }
    }
  }
}
```

**2. Monitor in Production:**
- Set up error tracking (Sentry)
- Monitor Core Web Vitals
- Track performance metrics
- Watch for regressions

**3. Regular Audits:**
- Run performance audit monthly
- Check for new anti-patterns
- Update this document with new findings

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-24 | Performance Audit | Initial document creation |
| 1.1 | 2024-12-24 | Claude Code | Phase 1 implementation completed |

---

## Additional Resources

- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Supabase Performance Best Practices](https://supabase.com/docs/guides/platform/performance)

---

**END OF DOCUMENT**

*This plan is ready for implementation. Start with Phase 1 and work through sequentially. Each phase builds on the previous, so complete validation before proceeding.*
