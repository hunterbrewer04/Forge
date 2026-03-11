import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/member/login(.*)',
  '/member/signup(.*)',
  '/member/plans(.*)',
  '/member/portal(.*)',
  '/api/calendar(.*)',
  '/api/webhooks/clerk(.*)',
  '/api/stripe/webhook(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Clerk's recommended matcher — excludes static files and all _next/ paths
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
}
