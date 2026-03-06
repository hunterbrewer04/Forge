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
  const { userId } = await auth()

  // Protect all non-public routes
  if (!isPublicRoute(request) && !userId) {
    await auth.protect()
  }

  // Redirect authenticated users away from login/signup pages
  const { pathname } = request.nextUrl
  const isAuthPage =
    pathname.startsWith('/member/login') || pathname.startsWith('/member/signup')

  if (userId && isAuthPage) {
    const returnTo = request.nextUrl.searchParams.get('return_to')
    const redirectUrl =
      returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? new URL(returnTo, request.url)
        : new URL('/home', request.url)
    return NextResponse.redirect(redirectUrl)
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-.*|apple-touch-icon.*|splash/.*|manifest.json|sw.js|offline.html|Forge-Full-Logo.PNG|forge-logo.png).*)',
  ],
}
