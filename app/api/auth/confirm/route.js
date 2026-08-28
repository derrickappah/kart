import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    const redirectTo = new URL(next, request.url)
    const response = NextResponse.redirect(redirectTo)

    if ((token_hash && type) || code) {
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
                                const secureOptions = {
                                    ...options,
                                    secure: process.env.NODE_ENV === 'production',
                                };
                                cookieStore.set(name, value, secureOptions)
                                response.cookies.set(name, value, secureOptions)
                            })
                        } catch (err) {
                            // ignore set settings error on serverside
                        }
                    }
                }
            }
        )

        let authError = null

        if (token_hash && type) {
            const { error } = await supabase.auth.verifyOtp({
                type,
                token_hash,
            })
            authError = error
        } else if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            authError = error
        }

        if (!authError) {
            // Redirect to the success URL or landing page with session cookies
            return response
        } else {
            console.error('Auth verification error:', authError.message)
            // Redirect to auth error page with error details
            const errorRedirect = new URL('/auth/auth-code-error', request.url)
            errorRedirect.searchParams.set('error', authError.message)
            errorRedirect.searchParams.set('status', authError.status || '400')
            return NextResponse.redirect(errorRedirect)
        }
    }

    // Redirect to error if parameters are missing
    const errorRedirect = new URL('/auth/auth-code-error', request.url)
    errorRedirect.searchParams.set('error', 'Missing verification parameters (token_hash or code)')
    return NextResponse.redirect(errorRedirect)
}

