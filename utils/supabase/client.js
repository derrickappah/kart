import { createBrowserClient } from '@supabase/ssr'

let client

export function createClient() {
    if (client) return client

    const isBrowser = typeof window !== 'undefined'
    const hostname = isBrowser ? window.location.hostname : ''
    const cookieDomain = hostname.endsWith('kart.cx') ? '.kart.cx' : undefined

    client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined
        }
    )

    return client
}
