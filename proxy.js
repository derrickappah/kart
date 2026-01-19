import { NextResponse } from 'next/server'

export async function proxy(request) {
    const { pathname } = request.nextUrl
    console.log(`[Proxy] Executing for: ${pathname}`)

    const response = NextResponse.next()
    response.headers.set('x-proxy-active', 'true')
    return response
}

export default proxy

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
