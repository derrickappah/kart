import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // 1. Canonical Redirect: redirect naked domain to www in production
  if (process.env.NODE_ENV === 'production' && url.hostname === 'kart.cx') {
    const canonicalUrl = new URL(request.url)
    canonicalUrl.hostname = 'www.kart.cx'
    return NextResponse.redirect(canonicalUrl, 301)
  }

  // Self-healing: if we receive an auth code on a page other than the callback,
  // redirect to the callback route handler to exchange the code for a session.
  if (code && !url.pathname.startsWith('/api/auth/callback')) {
    const callbackUrl = new URL('/api/auth/callback', request.url)
    url.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        maxAge: 400 * 24 * 60 * 60,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge === 0 ? 0 : (options?.maxAge ?? 400 * 24 * 60 * 60),
              sameSite: options?.sameSite || 'lax',
              path: options?.path || '/',
              secure: process.env.NODE_ENV === 'production',
            })
          )
        },
      },
    }
  )

  // Refresh the user's session — this is the core purpose of the middleware.
  const { data: { user } } = await supabase.auth.getUser()

  // Centralized Defense-in-Depth for Admin Routes
  const isAdminPath = url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/dashboard/admin')
  if (isAdminPath) {
    if (!user) {
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Prevent caching of the auth state check response on mobile browsers
  response.headers.set('x-middleware-cache', 'no-cache')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
