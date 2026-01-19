import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    try {
        // Validation for environment variables
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.error('[Middleware] Missing Supabase environment variables')
            return NextResponse.next({
                request: {
                    headers: request.headers,
                },
            })
        }

        let supabaseResponse = NextResponse.next({
            request,
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
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                request.cookies.set(name, value)
                            )
                            supabaseResponse = NextResponse.next({
                                request,
                            })
                            cookiesToSet.forEach(({ name, value, options }) =>
                                supabaseResponse.cookies.set(name, value, options)
                            )
                        } catch (cookieError) {
                            console.error('[Middleware] Error setting cookies:', cookieError)
                        }
                    },
                },
            }
        )

        // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
        // creating a new Response object with NextResponse.next() make sure to:
        // 1. Pass the request in it, like so:
        //    const myNewResponse = NextResponse.next({ request })
        // 2. Copy over the cookies, like so:
        //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
        // 3. Change the myNewResponse object to fit your needs, but avoid changing
        //    the cookies!
        // 4. Finally:
        //    return myNewResponse
        // If this is not done, you may be causing the browser and server to go out
        // of sync and terminate the user's session prematurely!

        const { pathname } = request.nextUrl
        // console.log(`[Middleware] Processing request for: ${pathname}`)

        // Explicitly handle subscription success route to prevent any 404 or redirect issues
        // Using a more robust check that covers both exact match and variations
        if (pathname.startsWith('/subscription/success')) {
            console.log('[Middleware] Subscription success route detected - allowing bypass')
            return supabaseResponse
        }

        await supabase.auth.getUser()

        return supabaseResponse
    } catch (e) {
        console.error('[Middleware] Error:', e)
        // If middleware fails, return the original response to avoid blocking the request
        // preventing a 500 error for the user, though auth might be broken
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes
         * - static assets
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
