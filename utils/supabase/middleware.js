import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
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
                        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({
                            request,
                        })
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        // IMPORTANT: You *must* return the supabaseResponse object as it is.
        // ... comments ...

        const { pathname } = request.nextUrl

        // Explicitly handle subscription success route to prevent any 404 or redirect issues
        if (pathname.startsWith('/subscription/success')) {
            console.log('[Middleware] Subscription success route detected - allowing bypass')
            return supabaseResponse
        }

        // Do not run code between createServerClient and
        // supabase.auth.getUser(). A simple mistake could make it very hard to debug
        // issues with users being randomly logged out.

        const {
            data: { user },
        } = await supabase.auth.getUser()

        // Example protected routes handling (can add here if needed, but currently just refreshing session)
        // if (!user && !request.nextUrl.pathname.startsWith('/login') && ... ) {
        //   // no user, potentially respond with redirect
        // }

        return supabaseResponse
    } catch (e) {
        console.error('[Middleware] Error:', e)
        // Return a safe response on error
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
    }
}
