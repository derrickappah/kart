'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '../../utils/supabase/server'

export async function login(formData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email'),
        password: formData.get('password'),
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/profile')
}

export async function signup(formData) {
    const supabase = await createClient()

    const email = formData.get('email')
    const password = formData.get('password')
    const fullName = formData.get('full_name')
    const referredBy = formData.get('referred_by')

    const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            }
        }
    })

    if (error) {
        return { error: error.message }
    }

    // If there's a referrer, record it in the profiles and tracking table
    if (referredBy && signUpData.user) {
        // We use service role to bypass RLS for initial profile setup if needed, 
        // but here we just try to update the profile which should be created by trigger
        // If profile creation trigger exists, we update it.
        const { createServiceRoleClient } = require('../../utils/supabase/server');
        const adminSupabase = createServiceRoleClient();

        await adminSupabase
            .from('profiles')
            .update({ referred_by: referredBy })
            .eq('id', signUpData.user.id);

        await adminSupabase
            .from('referrals_tracking')
            .insert({
                referrer_id: referredBy,
                referee_id: signUpData.user.id,
                status: 'Pending'
            });
    }

    revalidatePath('/', 'layout')
    redirect('/profile') // Or /verify-email if you enable that
}

export async function forgotPassword(formData) {
    const supabase = await createClient()
    const email = formData.get('email')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback?next=/dashboard/settings/security/password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: "Password reset link sent to your email." }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function signInWithGoogle(isApp = false) {
    const supabase = await createClient()
    const headerList = await headers()
    const host = headerList.get('host')
    const protocol = headerList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
    
    // Prioritize NEXT_PUBLIC_SITE_URL for production
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000')
    const currentOrigin = host ? `${protocol}://${host}` : 'http://localhost:3000'
    
    // Determine the redirect URL
    // We use a unique 'return_to_app' parameter to ensure it's not stripped by Supabase
    const finalRedirectTo = isApp 
        ? `${siteUrl}/api/auth/callback?return_to_app=true` 
        : `${currentOrigin}/api/auth/callback`
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: finalRedirectTo,
            queryParams: {
                prompt: 'select_account',
            }
        },
    })

    if (error) {
        console.error('Google sign in error:', error)
        return { error: error.message }
    }

    if (data.url) {
        return { url: data.url }
    }
}

export async function signInWithGoogleToken(idToken) {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
    })

    if (error) {
        console.error('Google token sign in error:', error)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}
