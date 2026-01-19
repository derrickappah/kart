import { NextResponse } from 'next/server'

export async function middleware(request) {
    const { pathname } = request.nextUrl
    console.log(`[Middleware] Executing for: ${pathname}`)

    const response = NextResponse.next()
    response.headers.set('x-middleware-active', 'true')
    response.headers.set('x-proxy-active', 'true')
    return response
}

export const proxy = middleware
export default middleware

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
