import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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
  const { pathname } = request.nextUrl

  // Redirect signed-in users away from auth pages to /home
  if (pathname.startsWith('/member/login') || pathname.startsWith('/member/signup')) {
    const { userId } = await auth()
    if (userId) {
      return NextResponse.redirect(new URL('/home', request.url))
    }
    return
  }

  // Protect all non-public routes
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
