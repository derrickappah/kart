import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const returnToApp = searchParams.get('return_to_app') === 'true'
    const next = searchParams.get('next') ?? '/'

    const isLocalEnv = process.env.NODE_ENV === 'development'
    const redirectBase = isLocalEnv ? origin : (process.env.NEXT_PUBLIC_SITE_URL || origin)
    
    // Create redirect response for normal web flow
    const response = NextResponse.redirect(`${redirectBase}${next}`)

    if (code) {
        // Create custom server client that attaches cookies directly to redirect response
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    async getAll() {
                        const cookieStore = await cookies()
                        return cookieStore.getAll()
                    },
                    async setAll(cookiesToSet) {
                        const cookieStore = await cookies()
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options)
                                response.cookies.set(name, value, options)
                            })
                        } catch (err) {
                            // ignore set settings error on serverside
                        }
                    }
                }
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error && data?.session) {
            // Short-Token Handoff: only pass the refresh_token to avoid URL length issues
            if (returnToApp || next === 'app' || next.includes('payment-redirect')) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || origin
                const { refresh_token } = data.session
                
                // Copy cookies to a new redirect response for the app redirect
                const appRedirectUrl = `${siteUrl}/api/payment-redirect?path=auth-tokens&refresh_token=${refresh_token}`
                const newResponse = NextResponse.redirect(appRedirectUrl)
                response.cookies.getAll().forEach(cookie => {
                    newResponse.cookies.set(cookie.name, cookie.value, cookie)
                })
                return newResponse
            }

            // Normal web flow
            return response
        }
    }

    // Default error fallback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
