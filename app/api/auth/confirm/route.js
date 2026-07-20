import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    const redirectTo = new URL(next, request.url)

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Redirect to the success URL or landing page
            return NextResponse.redirect(redirectTo)
        } else {
            console.error('verifyOtp error:', error.message)
            // Redirect to auth error page with error details
            const errorRedirect = new URL('/auth/auth-code-error', request.url)
            errorRedirect.searchParams.set('error', error.message)
            errorRedirect.searchParams.set('status', error.status || '400')
            return NextResponse.redirect(errorRedirect)
        }
    }

    // Redirect to error if parameters are missing
    const errorRedirect = new URL('/auth/auth-code-error', request.url)
    errorRedirect.searchParams.set('error', 'Missing verification parameters (token_hash or type)')
    return NextResponse.redirect(errorRedirect)
}
