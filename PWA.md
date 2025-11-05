# Claude Code Task: Implement PWA Technical Setup for Forge Trainer App

## Project Context

You're working on a Next.js 14 (TypeScript) gym trainer messaging PWA. The app currently has:
- ✅ Authentication system with Supabase
- ✅ Real-time text messaging working
- ✅ Photo/video upload functionality
- ✅ Mobile-responsive design

**Your task**: Implement the complete PWA infrastructure to make the app installable on iOS and Android devices.

---

## 🎯 OBJECTIVE

Make the app installable as a Progressive Web App WITHOUT creating any icons or visual designs. The manifest will have an empty icons array that will be populated later during the Figma design phase.

**Time Estimate**: 2-3 hours  
**Priority**: Get PWA working first, add icons/polish later

---

## 📋 REQUIREMENTS

### 1. Create Web App Manifest
- [ ] Create `/public/manifest.json`
- [ ] Configure app name: "Forge Trainer"
- [ ] Set display mode to "standalone" (fullscreen, no browser UI)
- [ ] Set theme color to `#3b82f6` (blue-500)
- [ ] Set background color to `#ffffff`
- [ ] Lock orientation to portrait
- [ ] **Leave icons array EMPTY** (will be populated later)

### 2. Link Manifest in App
- [ ] Update `/app/layout.tsx` metadata to include manifest
- [ ] Add iOS-specific meta tags for PWA support
- [ ] Add proper viewport meta tags
- [ ] Configure theme color for status bar

### 3. Create Service Worker
- [ ] Create `/public/sw.js` 
- [ ] Cache essential routes: `/`, `/chat`, `/login`, `/signup`
- [ ] Cache manifest.json
- [ ] Implement cache-first strategy with network fallback
- [ ] Skip caching for Supabase API calls (*.supabase.co)
- [ ] Handle offline scenarios gracefully
- [ ] Implement cache versioning (`forge-pwa-v1`)

### 4. Create Offline Fallback Page
- [ ] Create `/public/offline.html`
- [ ] Simple, styled HTML page with:
  - "You're Offline" message
  - Friendly explanation
  - "Try Again" button to reload
  - Purple gradient background
  - Mobile-responsive design

### 5. Register Service Worker
- [ ] Create `/lib/register-sw.ts` utility
- [ ] Register service worker on window load
- [ ] Log registration success/failure to console
- [ ] Implement auto-update check (every 60 seconds)
- [ ] Handle service worker lifecycle properly

### 6. Update App Structure for Registration
- [ ] Create `/app/providers.tsx` client component
- [ ] Move AuthProvider into Providers component
- [ ] Call `registerServiceWorker()` in useEffect
- [ ] Update `/app/layout.tsx` to use Providers wrapper
- [ ] Ensure server components remain server components

### 7. Create Install Prompt Component
- [ ] Create `/components/InstallPrompt.tsx` client component
- [ ] Listen for `beforeinstallprompt` event
- [ ] Show custom install prompt UI
- [ ] Handle install button click
- [ ] Handle dismiss button click
- [ ] Store dismiss state in localStorage
- [ ] Don't show if already installed (check display-mode)
- [ ] Style with Tailwind (clean, modern, mobile-friendly)

### 8. Add Install Prompt to App
- [ ] Import InstallPrompt in `/app/chat/page.tsx`
- [ ] Render InstallPrompt at the end of the component
- [ ] Ensure it doesn't break existing layout
- [ ] Position as fixed at bottom of screen

---

## 📂 FILE STRUCTURE TO CREATE

```
public/
├── manifest.json          # NEW - Web app manifest
├── sw.js                  # NEW - Service worker
└── offline.html           # NEW - Offline fallback page

lib/
└── register-sw.ts         # NEW - Service worker registration utility

app/
└── providers.tsx          # NEW - Client component wrapper

components/
└── InstallPrompt.tsx      # NEW - Install prompt UI component

app/layout.tsx             # MODIFY - Add manifest and meta tags
app/chat/page.tsx          # MODIFY - Add InstallPrompt component
```

---

## 💻 IMPLEMENTATION DETAILS

### `/public/manifest.json` Template

```json
{
  "name": "Forge Trainer",
  "short_name": "Forge",
  "description": "Real-time messaging app for gym trainers and clients",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": []
}
```

**IMPORTANT**: Icons array is intentionally empty. Do NOT add any icons.

---

### `/public/sw.js` Key Requirements

**Cache Strategy:**
1. Install: Cache essential URLs
2. Activate: Clean up old caches
3. Fetch: Serve from cache first, fallback to network

**Must Skip Caching:**
- Any URL containing `supabase.co`
- API calls
- Authentication requests

**Cache Version:**
- Use `forge-pwa-v1` as cache name
- Increment version when service worker changes

**Error Handling:**
- If fetch fails and no cache, serve `/offline.html`

---

### `/app/layout.tsx` Metadata Updates

Add these to metadata:
```typescript
manifest: "/manifest.json",
appleWebApp: {
  capable: true,
  statusBarStyle: "default",
  title: "Forge",
},
themeColor: "#3b82f6",
```

Add these meta tags in `<head>`:
```typescript
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Forge" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
```

---

### `/lib/register-sw.ts` Pattern

```typescript
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration)
          
          // Auto-update check
          setInterval(() => {
            registration.update()
          }, 60000)
        })
        .catch((error) => {
          console.error('❌ SW registration failed:', error)
        })
    })
  }
}
```

---

### `/app/providers.tsx` Pattern

This must be a client component that:
1. Wraps children with AuthProvider
2. Calls registerServiceWorker() in useEffect
3. Returns early while service worker registers (non-blocking)

```typescript
'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { registerServiceWorker } from '@/lib/register-sw'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}
```

---

### `/components/InstallPrompt.tsx` Requirements

**Functionality:**
- Listen for `beforeinstallprompt` event
- Store event in state
- Show custom UI when event fires
- Handle install button → call `prompt()`
- Handle dismiss button → hide and save to localStorage
- Check if already installed via `display-mode: standalone`
- Check localStorage for previous dismissal

**Styling:**
- Fixed position at bottom of screen
- White background with shadow
- Blue install button
- Gray dismiss button
- Mobile-first responsive
- Emoji icon (📱)
- Clean, modern Tailwind classes

**UX:**
- Don't show if already installed
- Don't show if user dismissed before
- Auto-hide after install
- Smooth appearance (can add animation)

---

## 🧪 TESTING REQUIREMENTS

After implementation, verify:

### Desktop Testing (Chrome DevTools)
1. Open Application tab in DevTools
2. Check Manifest section - should show "Forge Trainer"
3. Check Service Workers section - should show "activated"
4. Test offline mode:
   - Network tab → Set to "Offline"
   - Reload page → Should show offline.html
   - Navigate to /chat → Should load from cache

### Console Logging
Ensure these logs appear:
- `✅ Service Worker registered:` on app load
- `Opened cache` when service worker installs
- No errors related to PWA/manifest/service worker

### Mobile Testing (When Deployed)
1. Deploy to Vercel or similar HTTPS host
2. Test on real iPhone:
   - Open in Safari
   - Share → Add to Home Screen
   - Verify app opens fullscreen
3. Test on real Android:
   - Open in Chrome
   - Look for install prompt
   - Install and verify fullscreen

---

## ⚠️ IMPORTANT NOTES

### DO NOT:
- ❌ Create any icon files (png, ico, svg)
- ❌ Add icons to manifest.json
- ❌ Generate favicons
- ❌ Create splash screens
- ❌ Implement complex offline sync logic (keep it simple)

### DO:
- ✅ Keep manifest icons array empty
- ✅ Focus on getting PWA infrastructure working
- ✅ Test service worker registration
- ✅ Verify offline mode works
- ✅ Make sure install prompt appears
- ✅ Log everything to console for debugging

### AuthContext Consideration
The existing `/contexts/AuthContext.tsx` should remain unchanged. It's already being used in the app. Just wrap it with the new Providers component.

### Existing Code Preservation
- Don't break existing authentication flow
- Don't modify Supabase client files
- Don't change routing/middleware
- Don't alter chat functionality
- Only add PWA infrastructure on top

---

## 🐛 COMMON ISSUES TO AVOID

### Issue: Service Worker Not Registering
**Fix**: Ensure sw.js is in `/public` folder, not `/app` or elsewhere

### Issue: Manifest Not Loading
**Fix**: Verify manifest.json is valid JSON with no syntax errors

### Issue: Offline Mode Not Working
**Fix**: Check that URLs in `urlsToCache` match your actual routes exactly

### Issue: Install Prompt Not Showing
**Fix**: 
- Must be HTTPS (localhost is OK for testing)
- Service worker must be active
- User must visit site at least twice
- Can't be already installed

### Issue: Layout.tsx Type Errors
**Fix**: Make sure to separate server metadata from client component (Providers)

---

## ✅ SUCCESS CRITERIA

Your implementation is complete when:

1. **Manifest Loads**
   - DevTools → Application → Manifest shows "Forge Trainer"
   - No errors in manifest section
   - Icons array is empty (expected)

2. **Service Worker Active**
   - DevTools → Application → Service Workers shows "activated and running"
   - Console shows "✅ Service Worker registered"
   - No registration errors

3. **Offline Works**
   - Can navigate to cached pages when offline
   - Shows offline.html for uncached pages
   - No console errors when offline

4. **Install Prompt Appears**
   - Custom install prompt shows on supported browsers
   - Install button triggers installation
   - Dismiss button hides prompt
   - Doesn't show if already installed

5. **Mobile Install Works**
   - iOS: Can "Add to Home Screen" from Safari
   - Android: Install prompt appears in Chrome
   - App opens fullscreen (no browser UI)

---

## 📚 REFERENCE DOCUMENTATION

**Service Worker Lifecycle:**
- Install → Activate → Fetch
- Use `skipWaiting()` in install to activate immediately
- Use `clients.claim()` in activate to take control

**Cache Strategy:**
- Cache essential static assets on install
- Cache-first for performance
- Network fallback for reliability
- Skip caching for API calls

**PWA Install Requirements:**
- Valid manifest.json
- Service worker registered
- HTTPS connection (or localhost)
- Meets Chrome's installability criteria

---

## 🎯 DELIVERABLES

After completing this task, the project should have:

1. ✅ Working PWA manifest
2. ✅ Active service worker
3. ✅ Offline functionality
4. ✅ Install prompt UI
5. ✅ All files in correct locations
6. ✅ No breaking changes to existing features
7. ✅ Console logs confirming everything works
8. ✅ Ready for icon/design work in next phase

---

## 💡 ADDITIONAL CONTEXT

**Why Empty Icons Array?**
The client wants to design custom app icons in Figma before adding them. This setup gets the PWA infrastructure working so it can be tested, then icons will be added later.

**Why Simple Offline Page?**
The offline.html is intentionally basic. It will be redesigned in Figma to match the app's visual design later.

**Why Minimal Service Worker?**
We're avoiding complex offline sync for messages. If users are offline, they can view cached pages. Full offline message queue can be added later if needed.

---

## 🚀 NEXT STEPS AFTER COMPLETION

Once this is done:
1. Deploy to Vercel for HTTPS testing
2. Test on real mobile devices
3. Verify PWA functionality
4. Move to Figma for icon/visual design
5. Come back and populate manifest icons array
6. Polish offline page design
7. Add splash screens (optional)

---

**Remember**: Focus on getting the infrastructure working. Visual polish comes later with Figma. This task is purely technical setup.
