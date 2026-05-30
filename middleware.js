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

  const host = request.headers.get('host')
  const cleanHost = host ? host.split(':')[0] : ''
  const cookieDomain = cleanHost.endsWith('kart.cx') ? '.kart.cx' : undefined

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
              secure: process.env.NODE_ENV === 'production',
              ...(cookieDomain ? { domain: cookieDomain } : {})
            })
          )
        },
      },
    }
  )

  // IMPORTANT: This prevents the redirection loop by ensuring the session is refreshed
  await supabase.auth.getUser()

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
