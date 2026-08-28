'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

function getSiteUrl() {
    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return rawUrl.replace(/\/+$/, '')
}

export async function login(formData) {
    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    const next = String(formData.get('next') || '').trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        return { error: 'Please enter a valid email address.' }
    }

    if (!password) {
        return { error: 'Password is required.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        const errorMsg = error.message || 'Failed to log in.'
        if (errorMsg.toLowerCase().includes('email not confirmed')) {
            return {
                error: 'Your email has not been confirmed yet. Please check your inbox for the confirmation link or request a new one.',
                emailNotConfirmed: true,
                email,
            }
        }
        return { error: errorMsg }
    }

    revalidatePath('/', 'layout')
    const redirectTarget = (next && next.startsWith('/') && !next.startsWith('//')) ? next : '/'
    redirect(redirectTarget)
}

export async function signup(formData) {
    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    const fullName = String(formData.get('full_name') || '').trim()
    const referredBy = formData.get('referred_by')
    const next = String(formData.get('next') || '').trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        return { error: 'Please enter a valid email address.' }
    }

    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters long.' }
    }

    if (!fullName) {
        return { error: 'Full name is required.' }
    }

    const siteUrl = getSiteUrl()

    const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            emailRedirectTo: `${siteUrl}/api/auth/callback`,
        }
    })

    if (error) {
        return { error: error.message }
    }

    // Check if the user already exists (Supabase returns empty identities list)
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        return { error: 'An account with this email address already exists. Please log in instead.' }
    }

    // If there's a referrer, record it in the profiles and tracking table (only if valid UUID)
    const isValidUuid = referredBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(referredBy));
    if (isValidUuid && signUpData.user) {
        try {
            const { createServiceRoleClient } = await import('../../utils/supabase/server');
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
        } catch (referralError) {
            // Non-fatal: referral tracking failure should not block signup
            console.error('[signup] Referral tracking failed:', referralError.message);
        }
    }

    // If session was immediately created (auto-confirm enabled), redirect to destination
    if (signUpData.session) {
        revalidatePath('/', 'layout')
        const redirectTarget = (next && next.startsWith('/') && !next.startsWith('//')) ? next : '/'
        redirect(redirectTarget)
    }

    // If session is null, email confirmation is required by Supabase
    return {
        success: true,
        needsConfirmation: true,
        email,
        message: 'Account created! Please check your email to confirm your account before logging in.'
    }
}

export async function resendConfirmationEmail(formData) {
    const supabase = await createClient()
    const email = String(formData.get('email') || '').trim().toLowerCase()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        return { error: 'Please enter a valid email address.' }
    }

    const siteUrl = getSiteUrl()
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
            emailRedirectTo: `${siteUrl}/api/auth/callback`,
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: 'A fresh confirmation link has been sent to your email address.' }
}

export async function forgotPassword(formData) {
    const supabase = await createClient()
    const email = String(formData.get('email') || '').trim().toLowerCase()

    // Server-side email structure validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return { error: "Please enter a valid email address." }
    }

    const siteUrl = getSiteUrl()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: "Password reset link sent to your email." }
}

export async function sendMagicLink(formData) {
    const supabase = await createClient()
    const email = String(formData.get('email') || '').trim().toLowerCase()
    const next = String(formData.get('next') || '').trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        return { error: 'Please enter a valid email address.' }
    }

    const siteUrl = getSiteUrl()
    const redirectUrl = next && next.startsWith('/') && !next.startsWith('//')
        ? `${siteUrl}/api/auth/callback?next=${encodeURIComponent(next)}`
        : `${siteUrl}/api/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: true,
        }
    })

    if (error) {
        return { error: error.message }
    }

    return { success: 'Magic link sent! Please check your inbox and click the link to log in instantly.' }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}




