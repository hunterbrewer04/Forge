# Forge Mobile Redesign - Implementation Phases

## Phase 1: Foundation Components ✅ COMPLETE

### Create: BottomNav Component
**Location**: `/app/components/navigation/BottomNav.tsx`

**Requirements**:
- Fixed bottom navigation matching homepage.html mockup
- 5 items: Home, Schedule, Center FAB (+), Stats, Profile
- Active state: `text-primary` (#ff6714)
- Inactive state: `text-stone-500` with `hover:text-stone-300`
- Center FAB: elevated `-top-6` with primary background
- Safe area support: `pb-safe-bottom`
- Backdrop blur: `backdrop-blur-lg`
- Border: `border-t border-steel/30`

### Create: TopBar Component
**Location**: `/app/components/navigation/TopBar.tsx`

**Requirements**:
- Sticky header: `sticky top-0 z-30`
- Backdrop blur: `backdrop-blur-md`
- Background: `bg-background-dark/95`
- Border: `border-b border-steel/20`
- Safe area: `pt-safe-top`
- Props: `title`, `showBack`, `showNotifications`, `showMenu`

### Create: MobileLayout Component
**Location**: `/app/components/layout/MobileLayout.tsx`

**Requirements**:
- Max-width: `max-w-md mx-auto`
- Bottom padding: `pb-24` (for fixed nav)
- Wraps: TopBar + children + BottomNav
- Safe area handling

---

## Phase 2: Homepage Redesign ✅ COMPLETE

**Location**: `/app/(authenticated)/dashboard/page.tsx`

### 1. Hero Section
- Large gradient text: `bg-gradient-to-br from-white via-stone-200 to-stone-500`
- Text: "Legends aren't born—they're FORGED."
- "FORGED" in `text-primary`
- Subtitle below in `text-stone-400`

### 2. Stats Cards (2-column grid)
- Grid: `grid grid-cols-2 gap-3`
- Card 1: Current Streak
  - Background: `bg-gradient-to-br from-[#2a2a2a] to-[#202020]`
  - Border: `border border-steel/30`
  - Icon: `local_fire_department` (gold color `#D4AF37`)
  - Value: Large bold number + "Days"
- Card 2: Class Level
  - Same background/border
  - Icon: `military_tech`
  - Progress bar with primary color

### 3. Quick Actions Grid (2x2)
- Grid: `grid grid-cols-2 gap-3`
- Card 1: Schedule Session (PRIMARY)
  - Background: `bg-primary`
  - Icon: `calendar_month`
  - Text: "Schedule Session" + "BOOK NOW"
  - Min height: `min-h-[140px]`
- Card 2: Messages
  - Background: `bg-[#2a2a2a]`
  - Border: `border border-steel/30`
  - Icon: `mail`
  - Badge: "2 NEW" in top right
- Card 3: My Stats
  - Icon: `monitoring`
  - Subtitle: "+5% vs Last Wk"
- Card 4: Workout
  - Icon: `fitness_center`
  - Subtitle: "Next: Leg Day" in primary color

### 4. Recent Activity Feed
- Section header: "Recent Activity" + "View All" link
- Activity cards:
  - Background: `bg-[#23160f]`
  - Border: `border border-steel/20`
  - Icon circle on left (48px)
  - Title + timestamp
  - Optional XP badge on right

---

## Phase 3: Messages Redesign ✅ COMPLETE

**Locations**: 
- List: `/app/(authenticated)/messages/page.tsx`
- Thread: `/app/(authenticated)/messages/[conversationId]/page.tsx`

### 1. Header
- Title: "COMMS" (uppercase, bold)
- Back button (left)
- Notifications + New message FAB (right)

### 2. Search Bar
- Background: `bg-[#2a2a2a]`
- Rounded full
- Placeholder: "Search conversations..."

### 3. Conversation List
Each item:
- Avatar with online status dot (green, bottom-right)
- Name + timestamp (top row)
- Last message preview (truncated)
- Unread badge if applicable

### 4. Message Thread
- Header: Coach name + online status
- Message bubbles:
  - Received: `bg-[#2a2a2a]` (left-aligned)
  - Sent: `bg-primary` (right-aligned)
- Timestamps between groups
- Quick reply buttons at bottom

### 5. Message Input
- Fixed bottom
- Background: `bg-background-dark`
- Border top: `border-steel/20`
- Attachment button (left)
- Text input (center, rounded full, `bg-stone-800`)
- Send button (right, primary circle)

---

## Phase 4: Profile Page Redesign ✅ COMPLETE

**Location**: `/app/profile/page.tsx`

### 1. Profile Header
- Avatar (128px) with molten ring effect:
  - Gradient ring: `bg-gradient-to-tr from-primary via-orange-500 to-yellow-500`
  - Blur effect: `blur opacity-75`
  - Edit button overlay (bottom-right, primary background)
- Name: Bold uppercase
- Elite Member badge: Gold verified icon + "ELITE MEMBER" text
- "Member since" date below

### 2. Stats Dashboard (3-column grid)
- Card 1: Sessions count
  - Background: `bg-surface-dark`
  - Icon: `fitness_center`
- Card 2: Day Streak (HIGHLIGHTED)
  - Background: `bg-gradient-to-br from-primary/20 to-surface-dark`
  - Border: `border-primary/30`
  - Icon: `local_fire_department` (primary color)
- Card 3: Badges
  - Background: `bg-surface-dark`
  - Icon: `military_tech`

### 3. Settings Sections
**Account**:
- Personal Information (icon: `person`)
- Payment & Billing (icon: `payments`)

**Preferences**:
- Notifications (icon: `notifications`)
- App Settings (icon: `tune`)

**Support**:
- Help & Support (icon: `help`)

Each item:
- Icon in rounded square (10x10)
- Title + subtitle
- Chevron right
- Hover: `hover:bg-white/5`
- Icon hover: `group-hover:bg-primary`

### 4. Logout Button
- Full width
- Background: `bg-[#A50000]`
- Hover: `hover:bg-[#800000]`
- Icon + "LOG OUT" text

### 5. Version Footer
- Centered, small text
- "Foundry App v2.4.0"

---

## Phase 5: Schedule/Booking Page ✅ COMPLETE

**Location**: `/app/schedule/page.tsx`

### 1. Header & Tabs
- Title: "SESSION BOOKING"
- Tabs: Upcoming (active, orange underline) / History
- Profile icon + notifications (top right)

### 2. Next Up Card
- Background: `bg-[#2a2a2a]`
- Left border: `border-l-4 border-primary`
- Label: "NEXT UP" (small, uppercase, primary)
- Session name (large, bold)
- Time + coach info
- "RESCHEDULE" button

### 3. Calendar Selector
- Horizontal scroll
- Active date:
  - Background: `bg-primary`
  - Text: white
  - Day name + date number (large)
- Inactive dates:
  - Background: `bg-[#2a2a2a]`
  - Text: `text-stone-400`

### 4. Session Type Filters
- Horizontal chip buttons
- Active: `bg-primary`
- Inactive: `bg-[#2a2a2a]`
- Options: "All Sessions", "1-on-1", "Strength", "Conditioning"

### 5. Session Cards
Standard session:
- Background: `bg-[#2a2a2a]`
- Time (large, left side)
- Session name
- Duration + spots left
- Coach avatar + name
- Add button (white square with +)

Premium session:
- Background: `bg-gradient-to-br from-[#3a3a1a] to-[#2a2a2a]`
- Border: `border-[#D4AF37]/30`
- "PREMIUM" badge (top right, gold background)
- Add button: gold background with bolt icon

### 6. Filter FAB
- Floating action button (bottom right)
- Primary background
- Filter icon

---

## Implementation Notes

### TypeScript
- Use proper types for all props
- Type Supabase data
- No `any` types

### Data Integration
- Keep all existing Supabase queries
- Maintain real-time subscriptions
- Don't modify auth logic

### Styling
- Use Tailwind classes only
- Match exact colors from design spec
- Mobile viewport: 375px - 428px
- Max container: `max-w-md mx-auto`

### Testing Each Phase
1. Check mobile viewport
2. Verify touch targets (min 44px)
3. Test hover/active states
4. Confirm data loads correctly
5. No TypeScript/console errors
