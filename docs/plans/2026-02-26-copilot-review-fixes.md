# PR #58 Copilot Review Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all Copilot review comments on PR #58 — bug fixes, code quality, and structural improvements across 10 files.

**Architecture:** Small, targeted edits to existing files. No new components except one shared LogOutButton. Each task is independent and can be committed separately.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion

---

### Task 1: FAB dead CSS removal

**Files:**
- Modify: `app/trainer/sessions/page.tsx:331`

**Step 1: Remove dead `lg:bottom-8` from FAB button**

The FAB is `lg:hidden` so `lg:` prefixed utilities are dead code. Line 331, change:
```tsx
className="lg:hidden fixed bottom-24 right-4 size-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
```

The class is clean already — verify there's no `lg:bottom-8` (it may have been mentioned in an older diff). If not present, skip.

**Step 2: Commit**

```
fix: remove dead lg: CSS from mobile-only FAB button
```

---

### Task 2: Modal background semantic token

**Files:**
- Modify: `app/trainer/sessions/[id]/page.tsx:718`

**Step 1: Change modal background from `bg-bg-input` to `bg-bg-card`**

Line 718:
```tsx
// Before
<div className="relative w-full max-w-sm bg-bg-input rounded-2xl p-6">
// After
<div className="relative w-full max-w-sm bg-bg-card rounded-2xl p-6">
```

**Step 2: Commit**

```
fix: use bg-bg-card instead of bg-bg-input for session modal
```

---

### Task 3: Calendar icon visibility

**Files:**
- Modify: `app/trainer/settings/calendar/page.tsx:274`

**Step 1: Change Apple Calendar icon text from `text-text-secondary` to `text-text-primary`**

Line 274:
```tsx
// Before
<span className="text-text-secondary font-bold text-sm">A</span>
// After
<span className="text-text-primary font-bold text-sm">A</span>
```

**Step 2: Commit**

```
fix: improve Apple Calendar icon visibility in both themes
```

---

### Task 4: Payments membership card — fix dark mode gradient

**Files:**
- Modify: `app/payments/page.tsx:98-104`

**Problem:** The gradient uses `var(--text-primary)` which is `#ffffff` in dark mode, making the "dark premium card" become white. The text uses `text-bg-primary` which is dark in dark mode — dark text on white = unreadable.

**Step 1: Hardcode the card to always be dark with white text**

```tsx
// Before
<section
  className="rounded-2xl p-5 text-bg-primary"
  style={{ background: 'linear-gradient(135deg, var(--text-primary), #2a2a2a)' }}
>
  ...
  <span className="text-bg-primary/70 text-sm font-medium">Membership</span>
  <CreditCard size={24} className="text-bg-primary/50" />
  ...
  <div className="h-8 bg-bg-primary/20 rounded w-48 mb-3" />
  <div className="h-5 bg-bg-primary/20 rounded w-36" />
  ...
  <p className="text-bg-primary/70 text-sm">

// After
<section
  className="rounded-2xl p-5 text-white"
  style={{ background: 'linear-gradient(135deg, #111418, #2a2a2a)' }}
>
  ...
  <span className="text-white/70 text-sm font-medium">Membership</span>
  <CreditCard size={24} className="text-white/50" />
  ...
  <div className="h-8 bg-white/20 rounded w-48 mb-3" />
  <div className="h-5 bg-white/20 rounded w-36" />
  ...
  <p className="text-white/70 text-sm">
```

Replace all `text-bg-primary` within the membership `<section>` with `text-white`, and all `bg-bg-primary/20` with `bg-white/20`.

**Step 2: Also fix the "View Plans" link inside the card**

```tsx
// Before
className="inline-block bg-bg-primary text-text-primary py-2.5 px-5 rounded-xl font-semibold hover:bg-bg-primary/90 transition-colors text-sm"
// After
className="inline-block bg-white text-gray-900 py-2.5 px-5 rounded-xl font-semibold hover:bg-white/90 transition-colors text-sm"
```

**Step 3: Commit**

```
fix: make payments membership card always dark with white text
```

---

### Task 5: Home page CTA inline styles cleanup

**Files:**
- Modify: `app/home/page.tsx` (desktop CTA, ~line 377-385)

**Step 1: Move redundant inline styles to Tailwind classes**

```tsx
// Before
<Link
  href="/schedule"
  className="block"
  style={{
    background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
    borderRadius: '1rem',
    padding: '1.5rem',
    display: 'block',
  }}
>

// After
<Link
  href="/schedule"
  className="block rounded-2xl p-6"
  style={{
    background: 'linear-gradient(135deg, var(--facility-primary), color-mix(in srgb, var(--facility-primary) 70%, #000))',
  }}
>
```

Remove `borderRadius`, `padding`, and `display` from inline style (all covered by Tailwind classes). Keep `background` as inline since Tailwind can't do `color-mix`.

**Step 2: Commit**

```
refactor: move CTA inline styles to Tailwind classes on home page
```

---

### Task 6: Deduplicate header buttons in trainer sessions

**Files:**
- Modify: `app/trainer/sessions/page.tsx:138-185`

**Step 1: Extract shared button elements as local constants**

Before the `topBarRightContent` and `desktopHeaderRight` declarations, add:

```tsx
const refreshButton = (
  <button
    onClick={handleRefresh}
    className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-bg-secondary text-text-primary transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
    disabled={isRefreshing}
  >
    <RefreshCw
      size={20}
      className={isRefreshing ? 'animate-spin' : ''}
    />
  </button>
)

const settingsButton = (
  <button
    onClick={() => router.push('/trainer/settings')}
    className="flex items-center justify-center size-11 min-w-[44px] min-h-[44px] rounded-full bg-bg-secondary text-text-primary transition-colors hover:bg-primary/20 hover:text-primary active:scale-95"
  >
    <Settings size={20} />
  </button>
)
```

Then simplify both:

```tsx
const topBarRightContent = (
  <div className="flex items-center gap-2">
    {refreshButton}
    {settingsButton}
  </div>
)

const desktopHeaderRight = (
  <div className="flex items-center gap-2">
    {refreshButton}
    {settingsButton}
    <button
      onClick={() => router.push('/trainer/sessions/new')}
      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors active:scale-95"
    >
      <Plus size={18} />
      New Session
    </button>
  </div>
)
```

**Step 2: Commit**

```
refactor: deduplicate refresh/settings buttons in trainer sessions
```

---

### Task 7: Extract shared LogOutButton on profile page

**Files:**
- Modify: `app/profile/page.tsx`

**Step 1: Extract a local LogOutButton component at the top of the file (inside the default export, before the return)**

```tsx
const LogOutButton = () => (
  <button
    onClick={handleSignOut}
    disabled={signingOut}
    className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border text-text-primary py-4 rounded-xl font-semibold transition-all hover:bg-bg-secondary interactive-card disabled:opacity-50"
  >
    <LogOut size={22} />
    {signingOut ? 'Signing Out...' : 'Log Out'}
  </button>
)
```

**Step 2: Replace both sign-out buttons**

Desktop (inside identity card, ~line 237):
```tsx
<div className="hidden lg:block mt-2">
  <LogOutButton />
</div>
```

Mobile (bottom section, ~line 357):
```tsx
<section className="mt-8 mb-8 lg:hidden">
  <LogOutButton />
</section>
```

**Step 3: Commit**

```
refactor: extract shared LogOutButton on profile page
```

---

### Task 8: Restructure stats fetching on home page

**Files:**
- Modify: `app/home/page.tsx` (~lines 60-111)

**Step 1: Rename and add clarifying comment**

The `useEffect` that fetches stats is actually messaging-specific (conversation counts, trainer name). Rename `stats`/`loadingStats`/`setStats` to `messagingStats`/`loadingMessagingStats`/`setMessagingStats` and add a comment clarifying scope.

```tsx
// Before
const [stats, setStats] = useState<Stats>({ totalConversations: 0 })
const [loadingStats, setLoadingStats] = useState(true)

// After
const [messagingStats, setMessagingStats] = useState<Stats>({ totalConversations: 0 })
const [loadingMessagingStats, setLoadingMessagingStats] = useState(true)
```

Update all references: `stats.` → `messagingStats.`, `loadingStats` → `loadingMessagingStats`, `setStats` → `setMessagingStats`, `setLoadingStats` → `setLoadingMessagingStats`.

Add comment above the useEffect:
```tsx
// Fetch messaging-related stats (only for users with chat access)
```

**Step 2: Commit**

```
refactor: rename stats to messagingStats for clarity on home page
```

---

### Task 9: Improve client detail desktop layout

**Files:**
- Modify: `app/trainer/clients/[id]/page.tsx:45`

**Step 1: Change grid to fixed sidebar width for better balance**

```tsx
// Before
<motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
  ...
  <motion.div variants={fadeUpItem} className="lg:col-span-2">

// After
<motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6 space-y-6 lg:space-y-0">
  ...
  <motion.div variants={fadeUpItem}>
```

Remove `lg:col-span-2` from the right column wrapper since the grid template handles sizing.

**Step 2: Commit**

```
fix: tighten client detail desktop layout with fixed sidebar width
```

---

### Task 10: Conditional home page layout when Messages hidden

**Files:**
- Modify: `app/home/page.tsx` (desktop grid, ~line 367)

**Step 1: Make the grid responsive to whether Messages card is shown**

The current grid is always `grid-cols-5` with 3+2. When the user has no messaging access, the right column only has the Payments card, looking sparse.

```tsx
// Before
<div className="grid grid-cols-5 gap-6 items-start">
  <div className="col-span-3 space-y-4">
  ...
  <div className="col-span-2 space-y-4">

// After — use a variable for the grid
const hasMessaging = profile.is_trainer || profile.has_full_access

...

{hasMessaging ? (
  <div className="grid grid-cols-5 gap-6 items-start">
    <div className="col-span-3 space-y-4">
    ...
    <div className="col-span-2 space-y-4">
) : (
  <div className="grid grid-cols-2 gap-6 items-start">
    <div className="space-y-4">
    ...
    <div className="space-y-4">
)}
```

This gives non-messaging users a balanced 50/50 split instead of a lopsided 60/40 with one card.

NOTE: The `hasMessaging` variable likely already exists or can be derived from the conditional rendering. Use it to wrap the grid section. The left column content (CTA + Activity) and right column content (Payments + optional Clients stat) stay the same — only the grid proportions change.

**Step 2: Commit**

```
fix: balanced desktop grid when messages card is hidden
```

---

### Task 11: Clean up profile edit page padding and legacy colors

**Files:**
- Modify: `app/profile/edit/page.tsx:168-186, 198`

**Step 1: Remove the unnecessary padding wrapper div**

```tsx
// Before (line 198)
<div className="px-4 py-6 lg:px-0 lg:py-0">
  <GlassCard variant="subtle" className="p-8 lg:max-w-2xl lg:mx-auto">
    ...
  </GlassCard>
</div>

// After — remove wrapper, GlassCard handles all spacing
<GlassCard variant="subtle" className="p-8 lg:max-w-2xl lg:mx-auto">
  ...
</GlassCard>
```

**Step 2: Fix legacy `bg-stone-700` in loading skeleton (lines 168-186)**

Replace all `bg-stone-700` with `bg-bg-secondary`:

```tsx
// Before
<div className="h-4 bg-stone-700 rounded w-20" />
<div className="h-12 bg-stone-700 rounded-xl w-full" />

// After
<div className="h-4 bg-bg-secondary rounded w-20" />
<div className="h-12 bg-bg-secondary rounded-xl w-full" />
```

Also fix `bg-primary/30` → `bg-bg-secondary` for the button skeleton.

**Step 3: Commit**

```
fix: remove double padding wrapper and legacy skeleton colors in profile edit
```

---

### Task 12: Keep 2-column grid in session edit mode

**Files:**
- Modify: `app/trainer/sessions/[id]/page.tsx` (~lines 394-709)

**Problem:** View mode uses a 2-column grid (details left, bookings right). Edit mode switches to a single centered card (`lg:max-w-2xl lg:mx-auto`), causing a jarring layout reflow and hiding the bookings list.

**Step 1: Wrap the edit form in the same 2-column grid as view mode**

```tsx
// Before (line 540-541)
      ) : (
        /* Edit Form */
        <GlassCard variant="subtle" className="p-8 lg:max-w-2xl lg:mx-auto">
          ...
        </GlassCard>
      )}

// After
      ) : (
        /* Edit Form — keep 2-column grid so bookings stay visible */
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
          <div>
            <GlassCard variant="subtle" className="p-8">
              ... {/* existing form contents unchanged */}
            </GlassCard>
          </div>

          {/* Bookings list (read-only reference while editing) */}
          <div>
            <GlassCard variant="subtle" className="p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4">
                Bookings ({bookings.filter(b => b.status === 'confirmed').length})
              </h3>
              {bookings.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={32} className="text-text-muted mx-auto mb-2" />
                  <p className="text-text-secondary">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`bg-bg-input rounded-xl p-4 flex items-center gap-3 ${
                        booking.status === 'cancelled' ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
                        {booking.client?.avatar_url ? (
                          <img
                            src={booking.client.avatar_url}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {booking.client?.full_name || 'Unknown Client'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-400'
                            : booking.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400'
                            : booking.status === 'attended'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
```

NOTE: The bookings list in edit mode is a simplified read-only version (no "booked at" date) since it's just for reference. To avoid duplicating the bookings rendering, consider extracting a `BookingsList` local component used in both view and edit modes.

**Step 2: Extract BookingsList to avoid duplication**

Create a local component inside the page:
```tsx
const BookingsList = () => (
  <GlassCard variant="subtle" className="p-6">
    <h3 className="text-lg font-bold text-text-primary mb-4">
      Bookings ({bookings.filter(b => b.status === 'confirmed').length})
    </h3>
    {bookings.length === 0 ? (
      <div className="text-center py-6">
        <Users size={32} className="text-text-muted mx-auto mb-2" />
        <p className="text-text-secondary">No bookings yet</p>
      </div>
    ) : (
      <div className="space-y-2">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={`bg-bg-input rounded-xl p-4 flex items-center gap-3 ${
              booking.status === 'cancelled' ? 'opacity-50' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
              {booking.client?.avatar_url ? (
                <img src={booking.client.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <User size={20} className="text-text-secondary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary truncate">
                {booking.client?.full_name || 'Unknown Client'}
              </p>
              <p className="text-xs text-text-muted">
                Booked {new Date(booking.booked_at).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400'
                : booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400'
                : booking.status === 'attended' ? 'bg-blue-500/20 text-blue-400'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {booking.status}
            </span>
          </div>
        ))}
      </div>
    )}
  </GlassCard>
)
```

Then use `<BookingsList />` in both the view and edit mode right columns.

**Step 3: Commit**

```
fix: maintain 2-column grid in session edit mode to keep bookings visible
```

---

## Execution Order

Tasks are independent. Recommended grouping for commits:
- **Commit 1:** Tasks 1-3 (quick one-liners)
- **Commit 2:** Task 4 (payments dark mode fix)
- **Commit 3:** Tasks 5-6 (home CTA + sessions dedup)
- **Commit 4:** Task 7 (LogOut extraction)
- **Commit 5:** Task 8 (stats rename)
- **Commit 6:** Tasks 9-10 (layout improvements)
- **Commit 7:** Task 11 (profile edit cleanup)
- **Commit 8:** Task 12 (session edit layout)

Or combine into fewer commits at discretion.
