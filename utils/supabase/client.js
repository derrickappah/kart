import { createBrowserClient } from '@supabase/ssr'

let client

export function createClient() {
    if (client) return client

    client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookieOptions: {
                maxAge: 400 * 24 * 60 * 60, // 400 days (maximum standard cookie lifetime)
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        }
    )

    return client
}
