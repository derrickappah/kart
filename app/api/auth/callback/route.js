import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const returnToApp = searchParams.get('return_to_app') === 'true'
    const next = searchParams.get('next') ?? '/'

    const redirectBase = origin
    
    // Create redirect response for normal web flow
    const response = NextResponse.redirect(`${redirectBase}${next}`)

    if (code || (token_hash && type)) {
        // Create custom server client that attaches cookies directly to redirect response
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookieOptions: {
                    maxAge: 400 * 24 * 60 * 60,
                    sameSite: 'lax',
                    path: '/',
                    secure: process.env.NODE_ENV === 'production',
                },
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
                                    maxAge: options?.maxAge === 0 ? 0 : (options?.maxAge ?? 400 * 24 * 60 * 60),
                                    sameSite: options?.sameSite || 'lax',
                                    path: options?.path || '/',
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

        console.log('--- Auth Callback Diagnosing ---')
        console.log('Auth Code:', code ? 'present' : 'missing', 'Token Hash:', token_hash ? 'present' : 'missing')

        let sessionData = null
        let sessionError = null

        if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            sessionData = data
            sessionError = error
        } else if (token_hash && type) {
            const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
            sessionData = data
            sessionError = error
        }
        
        if (sessionError) {
            console.error('Auth verification error:', sessionError.message, 'Status:', sessionError.status)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(sessionError.message)}&status=${sessionError.status}`)
        } else {
            console.log('Auth verification Success!')
        }
        
        if (sessionData?.session) {
            // Short-Token Handoff: only pass the refresh_token to avoid URL length issues
            if (returnToApp || next === 'app' || next.includes('payment-redirect')) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || origin
                const { refresh_token } = sessionData.session
                
                // Copy cookies to a new redirect response for the app redirect
                const appRedirectUrl = `${siteUrl}/api/payment-redirect?path=auth-tokens&refresh_token=${refresh_token}`
                const newResponse = NextResponse.redirect(appRedirectUrl)
                response.cookies.getAll().forEach(cookie => {
                    newResponse.cookies.set(cookie.name, cookie.value, cookie)
                })
                return newResponse
            }

            // Normal web flow: Return HTML with client-side redirect to prevent cookie race condition
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <title>Redirecting...</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <meta http-equiv="refresh" content="0;url=${redirectBase}${next}">
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            min-height: 100vh; 
                            margin: 0; 
                            background-color: #f6f7f8; 
                        }
                        .container { 
                            text-align: center; 
                            padding: 24px;
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                            width: 320px;
                        }
                        .loader { 
                            border: 4px solid #f3f3f3; 
                            border-top: 4px solid #1daddd; 
                            border-radius: 50%; 
                            width: 48px; 
                            height: 48px; 
                            animation: spin 1s linear infinite; 
                            margin: 0 auto 24px; 
                        }
                        @keyframes spin { 
                            0% { transform: rotate(0deg); } 
                            100% { transform: rotate(360deg); } 
                        }
                        h2 {
                            margin: 0 0 12px;
                            color: #0e181b;
                            font-size: 20px;
                        }
                        p {
                            margin: 0;
                            color: #4f8596;
                            font-size: 15px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="loader"></div>
                        <h2>Redirecting...</h2>
                        <p>Completing your login...</p>
                    </div>
                    <script>
                        // Prevent cookie race condition on mobile browsers by redirecting client-side
                        window.location.href = "${redirectBase}${next}";
                    </script>
                </body>
                </html>
            `;

            const htmlResponse = new NextResponse(html, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'x-middleware-cache': 'no-cache',
                }
            });

            // Copy all session cookies to the HTML response explicitly
            // (headers.forEach doesn't reliably enumerate Set-Cookie from response.cookies.set)
            response.cookies.getAll().forEach(cookie => {
                htmlResponse.cookies.set(cookie.name, cookie.value, cookie);
            });

            return htmlResponse;
        } else {
            // For token verifications that confirm email without a full session object returned
            return NextResponse.redirect(`${redirectBase}${next}`)
        }
    } else {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=missing_code`)
    }
}

