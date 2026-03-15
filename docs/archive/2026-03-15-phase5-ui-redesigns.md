# Phase 5: UI Redesigns — Design Spec & Implementation Plan

**Date:** 2026-03-15
**Branch:** `feature/admin-dashboard`
**Status:** Approved — ready for implementation

---

## Overview

Five UI improvements covering the profile page, home dashboard, navigation sidebar, and booking modals. All changes use the existing CSS variable theming system for automatic light/dark mode support.

---

## 5.1 Profile Page Redesign

**File:** `app/profile/page.tsx` (~340 lines)

### Current State
- 2-column desktop layout: narrow identity card (left) + wider settings column (right)
- Columns are unequal width — left feels sparse, right is heavier
- Generic settings-list feel, no branding personality

### Design

**Equal 2-column grid** (`grid-cols-2` with equal widths).

**Left: Identity Card with Gradient Header**
- Gradient banner at top: `bg-gradient-to-br from-primary via-orange-500 to-amber-500` (~120px tall)
- Avatar (104px) overlaps the gradient edge with a gradient border ring (primary → orange)
- Online indicator dot (bottom-right of avatar)
- Name (Lexend, 24px bold) + "Member since" subtitle
- Flexible spacer to push bottom items down
- Theme toggle moved here from the right column (dark/light switch with toggle)
- Sign out button at the bottom of the card

**Right: Settings Card with Grouped Sections**
Three section groups with colored icon accents:

1. **Account** (blue icons)
   - Edit Profile
   - Training History
   - Notification Settings

2. **Billing & Tools** (green/blue icons)
   - Payment Methods
   - Calendar Feed

3. **Security** (red icon)
   - Reset Password

Each item: 40px icon box (rounded-xl, tinted background matching icon color) + label + chevron.

**Mobile:** Stacks vertically — identity card on top, settings below. Sign out at the very bottom (mobile only, hidden on desktop since it's in the identity card).

### Implementation Notes
- Keep all existing functionality (avatar upload, calendar export sheet, reset password modal)
- Replace the current `lg:grid-cols-[1fr_2fr]` with `lg:grid-cols-2`
- Move theme toggle from the Preferences GlassCard to the identity card
- Regroup settings items into 3 sections
- Use CSS variable classes throughout (`bg-bg-card`, `text-text-primary`, `border-border`)

---

## 5.2 Home Dashboard Updates

**File:** `app/home/page.tsx` (~611 lines)

### Changes

1. **Forge logo in greeting banner (desktop)**
   - Replace the current text-only "FORGE / PERFORMANCE" branding in the greeting card
   - Add the actual `Forge-Full-Logo.PNG` image (sized ~80px height) on the left side of the greeting card
   - Keep avatar + greeting text + notifications on the right

2. **Forge logo in greeting banner (mobile)**
   - The mobile custom header already shows "FORGE / PERFORMANCE" text
   - Replace with the actual logo image (smaller, ~48px height)

3. **Messages card height**
   - On desktop, the Messages card in the right column is shorter than the Sessions CTA + Activity in the left column
   - Add `min-h` or padding to the Messages card so the bottom edges of both columns align
   - Simple approach: add `flex-1` to the Messages card wrapper or add `min-h-[200px]`

---

## 5.3 Navigation — Sidebar Redesign

**Files:** `components/navigation/GlassSidebar.tsx`, `components/navigation/Sidebar.tsx`

### Current State
- GlassSidebar: Full Forge logo at top (h-36), takes up significant vertical space
- Sidebar (dark variant): Blue "F" icon with "FORGE" text

### Design — Option C: User Identity Header

**GlassSidebar header** (replace logo section):
- User avatar (40px, rounded-full) + Name + Role ("Athlete" / "Trainer" / "Admin")
- Green online dot
- Compact — ~60px height vs current ~180px

**Bottom section** (above sign out):
- Small "FORGE / Performance" text branding (Lexend, 14px, primary color)
- This provides subtle branding without taking sidebar real estate

**Sidebar (dark variant):** Apply the same pattern — user avatar + name header, small branding at bottom.

**Logo moved to home page:** The full `Forge-Full-Logo.PNG` now lives in the home page greeting card (see 5.2 above).

### Implementation Notes
- Remove the `<Image src="/Forge-Full-Logo.PNG">` from GlassSidebar header
- Replace with user avatar + name from `useAuth()` profile
- Add small branding text above the sign out button
- Same changes to Sidebar.tsx (dark variant)
- BottomNav stays unchanged (no logo there currently)

---

## 5.5 Modal Theming — Booking & Details Modals

**Files:**
- `app/schedule/components/BookingModal.tsx`
- `app/schedule/components/SessionDetailsSheet.tsx`
- `app/schedule/components/CancelBookingModal.tsx`

### Current State
- All three modals hardcode dark-theme classes: `bg-surface-dark`, `text-gray-400`, `bg-gray-700`, `bg-gray-800/50`, `text-white`
- Don't adapt to light mode

### Design

Replace all hardcoded classes with CSS variable tokens:

| Old Class | New Class |
|-----------|-----------|
| `bg-surface-dark` | `bg-bg-card` |
| `text-white` (headings) | `text-text-primary` |
| `text-gray-300` | `text-text-secondary` |
| `text-gray-400` | `text-text-secondary` |
| `text-gray-500` | `text-text-muted` |
| `bg-gray-700` (buttons) | `bg-bg-secondary` |
| `bg-gray-800/50` (sections) | `bg-bg-secondary` |
| `bg-gray-600` (drag handle) | `bg-text-muted` |

**Additional visual improvements:**
- Detail rows: wrap icons in icon boxes (`bg-primary/8 rounded-[10px] p-2`) instead of bare inline icons
- Add label/value pairs for each detail row (small uppercase label + value below)
- Close button: rounded circle (`bg-bg-secondary border border-border rounded-full size-8`) instead of bare X icon
- Availability section: card treatment with `bg-bg-secondary border border-border rounded-xl`

### Implementation Notes
- Structure stays the same (session info → availability → actions)
- Swipe-to-dismiss on mobile stays unchanged
- Session type color bar stays unchanged
- Loading/success/error states get the same token treatment
- The CancelBookingModal also gets the token treatment (it already has the reason textarea from Phase 1.5)

---

## Execution Order

All 5 items are independent and can be parallelized:

| Task | Files | Depends On |
|------|-------|------------|
| 5.1 Profile | `app/profile/page.tsx` | None |
| 5.2 Home | `app/home/page.tsx` | None |
| 5.3 Navigation | `GlassSidebar.tsx`, `Sidebar.tsx` | None |
| 5.5 Modals | `BookingModal.tsx`, `SessionDetailsSheet.tsx`, `CancelBookingModal.tsx` | None |

## Verification

- `npx tsc --noEmit` — clean TypeScript build
- `npm run lint` — no lint errors
- Both light and dark modes render correctly
- Mobile bottom sheets still swipe-to-dismiss
- Avatar upload still works on profile page
- Theme toggle still works
- All modal states (confirm/loading/success/error) themed correctly
