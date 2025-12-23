# Phase 2 Testing Guide

This guide provides step-by-step instructions for testing all Phase 2 security features before deploying to production.

## Prerequisites

- Development server running (`npm run dev`)
- At least two test users created in Supabase Auth
- Browser with developer tools (Chrome/Firefox recommended)
- Optional: curl or Postman for API testing

---

## 1. Proxy Middleware Testing

### Test 1.1: Protected Route Redirect (Unauthenticated)

**Purpose:** Verify unauthenticated users are redirected to login

**Steps:**
1. Open browser in incognito/private mode
2. Navigate to `http://localhost:3000/chat`
3. Verify you're redirected to `/login?return_to=/chat`
4. Check URL contains `return_to` parameter

**Expected Result:**
- ✅ Redirected to login page
- ✅ URL contains `?return_to=/chat`

### Test 1.2: Return URL Preservation

**Purpose:** Verify user is redirected to intended destination after login

**Steps:**
1. From previous test, you should be at `/login?return_to=/chat`
2. Log in with valid credentials
3. Verify you're redirected to `/chat` (not `/home`)

**Expected Result:**
- ✅ After login, automatically redirected to `/chat`
- ✅ Chat page loads successfully

### Test 1.3: Authenticated User Access

**Purpose:** Verify authenticated users can access protected routes

**Steps:**
1. Ensure you're logged in
2. Navigate to `http://localhost:3000/home`
3. Navigate to `http://localhost:3000/chat`
4. Verify both pages load without redirect

**Expected Result:**
- ✅ `/home` loads successfully
- ✅ `/chat` loads successfully
- ✅ No redirects to login

### Test 1.4: Auth Page Redirect (Authenticated)

**Purpose:** Verify logged-in users can't access auth pages

**Steps:**
1. Ensure you're logged in
2. Navigate to `http://localhost:3000/login`
3. Navigate to `http://localhost:3000/signup`

**Expected Result:**
- ✅ Both pages redirect to `/home`
- ✅ No login/signup forms displayed

---

## 2. AuthContext Testing

### Test 2.1: Session Load on Mount

**Purpose:** Verify auth state loads correctly on app start

**Steps:**
1. Open browser dev tools (F12)
2. Go to Console tab
3. Refresh the page at `/home` or `/chat`
4. Watch for any auth-related errors

**Expected Result:**
- ✅ No errors in console
- ✅ User profile loads
- ✅ Page renders after brief loading state

### Test 2.2: Session Refresh

**Purpose:** Verify session can be manually refreshed

**Steps:**
1. Open browser dev tools → Console
2. In console, run:
   ```javascript
   // Access the auth context (you may need to expose it for testing)
   // Or trigger a session refresh by waiting for token expiration
   ```
3. Alternatively, wait 50-60 minutes for automatic token refresh
4. Verify no logout occurs

**Expected Result:**
- ✅ Session refreshes without logout
- ✅ User remains authenticated

### Test 2.3: Logout

**Purpose:** Verify logout clears all auth state

**Steps:**
1. Log in to the app
2. Click logout button (if available) or manually sign out
3. Verify redirect to login/home page
4. Try to access `/chat`

**Expected Result:**
- ✅ User logged out successfully
- ✅ Auth state cleared
- ✅ Redirected to login when accessing protected routes

### Test 2.4: Error Handling

**Purpose:** Verify auth errors are tracked

**Steps:**
1. Open browser dev tools → Console
2. Simulate an auth error by:
   - Clearing cookies manually
   - Or using invalid session tokens
3. Try to refresh the page
4. Check console for error logging

**Expected Result:**
- ✅ Error logged to console (server-side)
- ✅ User redirected to login
- ✅ No unhandled exceptions

---

## 3. API Route Authentication Testing

### Test 3.1: Unauthenticated Request

**Purpose:** Verify API routes reject unauthenticated requests

**Using curl:**
```bash
curl http://localhost:3000/api/example
```

**Using browser:**
1. Open incognito/private window
2. Open dev tools → Console
3. Run:
   ```javascript
   fetch('/api/example').then(r => r.json()).then(console.log)
   ```

**Expected Result:**
```json
{
  "error": "Unauthorized - No valid session",
  "code": "NO_SESSION",
  "timestamp": "2024-12-16T..."
}
```

**Status Code:** 401 Unauthorized

### Test 3.2: Authenticated Request

**Purpose:** Verify API routes accept authenticated requests

**Using browser (logged in):**
1. Ensure you're logged in
2. Open dev tools → Console
3. Run:
   ```javascript
   fetch('/api/example').then(r => r.json()).then(console.log)
   ```

**Expected Result:**
```json
{
  "message": "This is a secure API endpoint",
  "userId": "your-user-id",
  "timestamp": "2024-12-16T..."
}
```

**Status Code:** 200 OK

### Test 3.3: POST Request with Validation

**Purpose:** Verify request validation works

**Test Invalid Request:**
```javascript
fetch('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '' })  // Too short
}).then(r => r.json()).then(console.log)
```

**Expected Result:**
```json
{
  "error": "Validation failed: message: String must contain at least 1 character(s)",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-12-16T..."
}
```

**Status Code:** 400 Bad Request

**Test Valid Request:**
```javascript
fetch('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello, world!',
    priority: 'high'
  })
}).then(r => r.json()).then(console.log)
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Data processed successfully",
  "userId": "your-user-id",
  "receivedMessage": "Hello, world!",
  "priority": "high",
  "timestamp": "2024-12-16T..."
}
```

**Status Code:** 201 Created

---

## 4. Rate Limiting Testing

### Test 4.1: General Rate Limit (60 req/min)

**Purpose:** Verify rate limiting works

**Using JavaScript:**
```javascript
// Send 70 requests rapidly
async function testRateLimit() {
  for (let i = 1; i <= 70; i++) {
    const response = await fetch('/api/example')
    const data = await response.json()
    console.log(`Request ${i}: ${response.status}`, data)

    if (response.status === 429) {
      console.log('Rate limit hit at request', i)
      console.log('Retry-After:', response.headers.get('Retry-After'))
      break
    }
  }
}

testRateLimit()
```

**Expected Result:**
- ✅ First ~60 requests succeed (200)
- ✅ Request 61+ returns 429
- ✅ Response includes `Retry-After` header
- ✅ Error message indicates rate limit

**Example Rate Limit Response:**
```json
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "timestamp": "2024-12-16T..."
}
```

### Test 4.2: Messaging Rate Limit (30 req/min)

**Purpose:** Verify stricter rate limits for POST

**Using JavaScript:**
```javascript
async function testPostRateLimit() {
  for (let i = 1; i <= 35; i++) {
    const response = await fetch('/api/example', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Test ${i}`, priority: 'medium' })
    })
    const data = await response.json()
    console.log(`Request ${i}: ${response.status}`)

    if (response.status === 429) {
      console.log('Rate limit hit at request', i)
      break
    }
  }
}

testPostRateLimit()
```

**Expected Result:**
- ✅ First ~30 requests succeed (201)
- ✅ Request 31+ returns 429
- ✅ Rate limit is stricter for POST than GET

### Test 4.3: Rate Limit Reset

**Purpose:** Verify rate limits reset after time window

**Steps:**
1. Trigger rate limit (send 70 requests)
2. Note the `Retry-After` header value
3. Wait for that duration
4. Send another request

**Expected Result:**
- ✅ Rate limit clears after time window
- ✅ Requests succeed again

---

## 5. Error Handling Testing

### Test 5.1: Validation Errors

**Test Missing Field:**
```javascript
fetch('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
}).then(r => r.json()).then(console.log)
```

**Expected:**
- Status: 400
- Error code: VALIDATION_ERROR
- Lists missing fields

### Test 5.2: Malformed JSON

**Test Invalid JSON:**
```javascript
fetch('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: 'not valid json'
}).then(r => r.json()).then(console.log)
```

**Expected:**
- Status: 400
- Error message about invalid JSON
- No stack trace exposed

### Test 5.3: No Stack Traces

**Purpose:** Verify internal errors don't leak details

**Check:**
- All error responses are in standard format
- No `stack` property in responses
- No internal file paths exposed
- Generic messages for unexpected errors

---

## 6. Browser Tab Synchronization

### Test 6.1: Multi-Tab Auth State

**Purpose:** Verify auth state syncs across tabs

**Steps:**
1. Open app in Tab 1 (logged in)
2. Open app in Tab 2 (should also be logged in)
3. Log out in Tab 1
4. Check Tab 2

**Expected Result:**
- ✅ Tab 2 also logs out (auth listener works)
- ✅ Both tabs redirect to login

### Test 6.2: Login in One Tab

**Purpose:** Verify login syncs across tabs

**Steps:**
1. Open app in Tab 1 (logged out)
2. Open app in Tab 2 (logged out)
3. Log in via Tab 1
4. Check Tab 2

**Expected Result:**
- ✅ Tab 2 updates to logged-in state
- ✅ Both tabs show authenticated content

---

## 7. Edge Cases

### Test 7.1: Expired Session

**Purpose:** Verify expired sessions are handled

**Steps:**
1. Log in to the app
2. Manually expire the session (wait or manipulate tokens)
3. Try to access `/chat`
4. Try to use API routes

**Expected Result:**
- ✅ Redirected to login
- ✅ API routes return 401
- ✅ No unhandled errors

### Test 7.2: Invalid Return URL

**Purpose:** Verify return_to validation

**Steps:**
1. Log out
2. Manually navigate to `/login?return_to=https://evil.com`
3. Log in

**Expected Result:**
- ✅ NOT redirected to evil.com
- ✅ Redirected to /home instead
- ✅ Only relative URLs accepted

### Test 7.3: Concurrent Requests

**Purpose:** Verify app handles concurrent auth checks

**Steps:**
1. Log in
2. Open multiple tabs
3. Navigate to different protected routes simultaneously
4. Check for race conditions

**Expected Result:**
- ✅ No errors in console
- ✅ All tabs load correctly
- ✅ Auth state consistent

---

## 8. Production Deployment Testing

After deploying to Vercel, test these scenarios:

### Test 8.1: Vercel Environment

**Verify:**
- [ ] Environment variables set in Vercel dashboard
- [ ] App starts without errors
- [ ] Auth redirects work in production
- [ ] API routes require authentication
- [ ] Rate limiting works (test with real requests)
- [ ] Error responses don't leak internal details

### Test 8.2: Cold Start Behavior

**Purpose:** Verify rate limiting works after cold start

**Steps:**
1. Wait for serverless function to go cold (no requests for ~5 min)
2. Send requests to trigger warm-up
3. Test rate limiting

**Expected Result:**
- ✅ Rate limiting works after cold start
- ✅ In-memory store initializes correctly

### Test 8.3: Edge Runtime

**Purpose:** Verify proxy.ts runs on Edge Runtime

**Check Vercel Logs:**
- [ ] Proxy function runs on Edge (not Node.js)
- [ ] Auth checks are fast (<100ms)
- [ ] No Edge Runtime incompatibility errors

---

## 9. Security Testing

### Test 9.1: Auth Bypass Attempts

**Try to bypass auth:**
```javascript
// Attempt to access API without cookies
fetch('/api/example', {
  credentials: 'omit'  // Don't send cookies
}).then(r => r.json()).then(console.log)
```

**Expected:**
- Status: 401
- Error: No valid session

### Test 9.2: Rate Limit Bypass Attempts

**Try to bypass rate limits:**
1. Clear cookies between requests
2. Use different user agents
3. Send from different IP (VPN)

**Expected:**
- ✅ Rate limits still apply
- ✅ No easy bypass methods

### Test 9.3: Injection Prevention

**Test XSS Prevention:**
```javascript
fetch('/api/example', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '<script>alert("XSS")</script>',
    priority: 'high'
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- ✅ Request validated and sanitized
- ✅ Script tags removed/escaped
- ✅ No XSS vulnerability

---

## 10. Performance Testing

### Test 10.1: Auth Check Overhead

**Measure auth validation time:**

**Steps:**
1. Open browser dev tools → Network tab
2. Send request to `/api/example`
3. Check request timing

**Expected:**
- Auth validation: < 100ms
- Total request time: < 200ms (for simple endpoint)

### Test 10.2: Rate Limit Check Overhead

**Measure rate limit check time:**

**Expected:**
- Rate limit check: < 10ms
- Minimal impact on overall request time

---

## Automated Testing Script

For convenience, here's a comprehensive test script:

```javascript
// Phase 2 Automated Testing Suite
// Run in browser console (when logged in)

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2 Security Tests...\n')

  // Test 1: Authentication
  console.log('1️⃣ Testing Authentication...')
  const authTest = await fetch('/api/example')
  console.log('Auth Test:', authTest.status === 200 ? '✅ PASS' : '❌ FAIL')

  // Test 2: Request Validation
  console.log('\n2️⃣ Testing Request Validation...')
  const invalidRequest = await fetch('/api/example', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' })
  })
  console.log('Validation Test:', invalidRequest.status === 400 ? '✅ PASS' : '❌ FAIL')

  // Test 3: Valid Request
  console.log('\n3️⃣ Testing Valid Request...')
  const validRequest = await fetch('/api/example', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Test message', priority: 'high' })
  })
  console.log('Valid Request Test:', validRequest.status === 201 ? '✅ PASS' : '❌ FAIL')

  // Test 4: Rate Limiting
  console.log('\n4️⃣ Testing Rate Limiting (sending 70 requests)...')
  let rateLimitHit = false
  let rateLimitAtRequest = 0

  for (let i = 1; i <= 70; i++) {
    const response = await fetch('/api/example')
    if (response.status === 429) {
      rateLimitHit = true
      rateLimitAtRequest = i
      break
    }
  }

  console.log('Rate Limit Test:', rateLimitHit ? '✅ PASS' : '❌ FAIL')
  if (rateLimitHit) {
    console.log(`  Rate limit hit at request ${rateLimitAtRequest}`)
  }

  console.log('\n✅ All tests complete!')
}

// Run the tests
runPhase2Tests()
```

---

## Troubleshooting

### Issue: Protected routes not redirecting

**Solution:**
- Check that proxy.ts is configured correctly in `next.config.js` or via export
- Verify `protectedRoutes` array includes the route
- Check browser cookies are enabled

### Issue: Rate limiting not working

**Solution:**
- Verify you're sending requests from the same session
- Check that userId is being passed to `checkRateLimit`
- Restart dev server (in-memory store resets)

### Issue: API routes return 401 even when logged in

**Solution:**
- Check session cookies are being sent
- Verify Supabase environment variables are correct
- Check browser console for auth errors
- Ensure cookies aren't being blocked by browser settings

### Issue: Return URL not preserving

**Solution:**
- Check proxy.ts is setting `return_to` parameter
- Verify login page is reading searchParams correctly
- Ensure redirect happens after successful login

---

## Checklist: Ready for Production

Before deploying Phase 2 to production:

**Auth Flow:**
- [ ] Protected routes redirect to login ✅
- [ ] Return URL preserved and working ✅
- [ ] Authenticated users redirected from auth pages ✅
- [ ] Session refresh working ✅
- [ ] Logout clears all state ✅

**API Security:**
- [ ] Example API route works ✅
- [ ] Authentication required for all endpoints ✅
- [ ] Rate limiting active ✅
- [ ] Request validation working ✅
- [ ] Error handling consistent ✅
- [ ] No stack traces in responses ✅

**Code Quality:**
- [ ] All utilities documented ✅
- [ ] Example route provided ✅
- [ ] README.md created for lib/api ✅
- [ ] Phase 2 report complete ✅

**Deployment:**
- [ ] Environment variables set in Vercel
- [ ] Local testing complete
- [ ] Production testing planned
- [ ] Monitoring set up (optional)

---

## Next Steps

After completing all tests:

1. ✅ Review test results
2. ✅ Fix any failures
3. ✅ Commit changes to git
4. ✅ Deploy to Vercel
5. ✅ Run production tests
6. ✅ Monitor for errors
7. ✅ Move to Phase 3

---

**Happy Testing! 🧪**
