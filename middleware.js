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
            })
          )
        },
      },
    }
  )

  // Fetch Maintenance Mode Status from DB
  let isMaintenance = false
  try {
    const { data: maintenanceSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()
    if (maintenanceSetting?.value === true || maintenanceSetting?.value === 'true') {
      isMaintenance = true
    }
  } catch (err) {
    console.error('Error fetching maintenance mode status in middleware:', err)
  }

  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('banned, is_admin')
      .eq('id', user.id)
      .single()

    if (profile?.banned) {
      if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth/')) {
        return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
      }
      if (!url.pathname.startsWith('/banned') && !url.pathname.startsWith('/auth/')) {
        return NextResponse.redirect(new URL('/banned', request.url))
      }
    } else if (url.pathname.startsWith('/banned')) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (profile?.is_admin) {
      isAdmin = true
    }
  } else if (url.pathname.startsWith('/banned')) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Maintenance Mode Interception
  if (isMaintenance && !isAdmin) {
    const isExempt =
      url.pathname.startsWith('/maintenance') ||
      url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/api/auth/')

    if (!isExempt) {
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Service Unavailable: Platform is under maintenance' },
          { status: 503 }
        )
      }
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
  } else if (!isMaintenance && url.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/', request.url))
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
