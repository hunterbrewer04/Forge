import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env-validation'

/**
 * Next.js 16 proxy for authentication and session management
 *
 * Security Features:
 * - Automatic session refresh on each request
 * - Protected route enforcement with redirects
 * - Return URL preservation for post-login navigation
 * - Prevents authenticated users from accessing auth pages
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Use validated environment variables from Phase 1
  const supabase = createServerClient(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get user and refresh session if needed
  // This ensures the session is always fresh and handles token refresh automatically
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/chat', '/home']
  const authRoutes = ['/login', '/signup']

  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname === route
  )

  // If accessing a protected route without authentication, redirect to login
  if (isProtectedRoute && (!user || authError)) {
    // Preserve the intended destination for post-login redirect
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('return_to', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated and accessing login/signup, redirect to home
  if (user && !authError && isAuthRoute) {
    // Check if there's a return_to parameter
    const returnTo = request.nextUrl.searchParams.get('return_to')
    const redirectUrl = returnTo && returnTo.startsWith('/')
      ? new URL(returnTo, request.url)
      : new URL('/home', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
