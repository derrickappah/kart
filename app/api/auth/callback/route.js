import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const returnToApp = searchParams.get('return_to_app') === 'true'
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error && data?.session) {
            // Short-Token Handoff: only pass the refresh_token to avoid URL length issues
            if (returnToApp || next === 'app' || next.includes('payment-redirect')) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || origin
                const { refresh_token } = data.session
                
                // Pivot to bridge with ONLY the refresh token
                return NextResponse.redirect(
                    `${siteUrl}/api/payment-redirect?path=auth-tokens&refresh_token=${refresh_token}`
                )
            }

            // Normal web flow
            const isLocalEnv = process.env.NODE_ENV === 'development'
            const redirectBase = isLocalEnv ? origin : (process.env.NEXT_PUBLIC_SITE_URL || origin)
            return NextResponse.redirect(`${redirectBase}${next}`)
        }
    }

    // Default error fallback
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
