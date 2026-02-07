import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Supabase Auth Middleware
 *
 * Refreshes expired auth sessions on every request by reading/writing
 * session cookies. This is required for @supabase/ssr to work correctly —
 * without it, sessions silently expire and server components can't set cookies.
 *
 * Also protects authenticated routes by redirecting unauthenticated users to /login.
 */

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/api/calendar']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — this is the primary purpose of this middleware.
  // getUser() makes a network call to verify the token, unlike getSession()
  // which only reads the JWT locally.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow public routes and static assets
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute && !isStaticAsset) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, splash screens, manifest, sw.js
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-.*|apple-touch-icon.*|splash/.*|manifest.json|sw.js|offline.html|Forge-Full-Logo.PNG).*)',
  ],
}
