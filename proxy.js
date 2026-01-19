import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
    const { pathname } = request.nextUrl

    try {
        console.log(`[Proxy] Request Path: ${pathname}`)
        console.log(`[Proxy] Method: ${request.method}`)

        // Basic response to ensure middleware is active
        const response = NextResponse.next()

        // Add a diagnostic header
        response.headers.set('x-proxy-active', 'true')

        return response
    } catch (e) {
        console.error(`[Proxy] Error for path ${pathname}:`, e)
        return NextResponse.next()
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
