import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env-validation'

/**
 * Next.js 16 proxy for authentication and session management
 *
 * Security Features:
 * - "Protect by default" — only explicitly listed routes are public
 * - Automatic session refresh on each request
 * - Return URL preservation for post-login navigation
 * - Prevents authenticated users from accessing auth pages
 */

const PUBLIC_ROUTES = ['/', '/member/login', '/member/signup', '/api/calendar']
const AUTH_ROUTES = ['/member/login', '/member/signup']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
      cookieOptions: {
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route)
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')

  // Redirect unauthenticated users away from protected routes
  if (!user || authError) {
    if (!isPublicRoute && !isStaticAsset) {
      const loginUrl = new URL('/member/login', request.url)
      loginUrl.searchParams.set('return_to', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && !authError && isAuthRoute) {
    const returnTo = request.nextUrl.searchParams.get('return_to')
    const redirectUrl =
      returnTo && returnTo.startsWith('/')
        ? new URL(returnTo, request.url)
        : new URL('/home', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, splash screens, PWA assets
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-.*|apple-touch-icon.*|splash/.*|manifest.json|sw.js|offline.html|Forge-Full-Logo.PNG).*)',
  ],
}
