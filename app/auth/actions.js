'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'

function getSiteUrl() {
    const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return rawUrl.replace(/\/+$/, '')
}

function mapAuthError(error) {
    if (!error) return 'Failed to log in. Please try again.';
    const msg = (error.message || '').toLowerCase();
    
    if (msg.includes('email not confirmed')) {
        return 'Your email has not been confirmed yet. Please check your inbox for the confirmation link or request a new one below.';
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
        return 'Incorrect email or password. Please double-check your credentials and try again.';
    }
    if (msg.includes('user not found')) {
        return 'No account found with this email address. Please check for typos or sign up.';
    }
    if (msg.includes('banned') || msg.includes('disabled') || msg.includes('not allowed')) {
        return 'This account has been suspended. Please contact support for assistance.';
    }
    if (msg.includes('rate limit') || msg.includes('too many') || msg.includes('over_email_send_rate_limit')) {
        return 'Too many attempts. Please wait a few minutes before trying again.';
    }
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('timeout')) {
        return 'Network connection error. Please check your internet connection and try again.';
    }
    if (msg.includes('database error') || msg.includes('server error')) {
        return 'Authentication service is temporarily unavailable. Please try again shortly.';
    }
    return error.message || 'Unable to log in. Please try again.';
}

export async function login(formData) {
    const supabase = await createClient()

    const email = String(formData.get('email') || '').trim().toLowerCase()
    const password = String(formData.get('password') || '')
    const next = String(formData.get('next') || '').trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
        return { error: 'Please enter your email address.' }
    }
    if (!emailRegex.test(email)) {
        return { error: 'Please enter a valid email address (e.g. name@domain.com).' }
    }

    if (!password) {
        return { error: 'Please enter your password.' }
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        const errorMsg = mapAuthError(error)
        const isUnconfirmed = (error.message || '').toLowerCase().includes('email not confirmed')
        return {
            error: errorMsg,
            emailNotConfirmed: isUnconfirmed,
            email: isUnconfirmed ? email : undefined,
        }
    }

    // Edge Case: Check if the user is banned in profiles
    if (signInData?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('banned')
            .eq('id', signInData.user.id)
            .maybeSingle()

        if (profile?.banned) {
            await supabase.auth.signOut()
            return {
                error: 'Your account has been suspended. If you believe this is a mistake, please contact support.',
                isBanned: true,
            }
        }
    }

    revalidatePath('/', 'layout')

    // Ensure redirect target is safe and doesn't loop back to login/signup/auth
    let redirectTarget = '/'
    if (
        next &&
        next.startsWith('/') &&
        !next.startsWith('//') &&
        !next.startsWith('/login') &&
        !next.startsWith('/signup') &&
        !next.startsWith('/auth/')
    ) {
        redirectTarget = next
    }

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
    if (!email) {
        return { error: 'Please enter your email address.' }
    }
    if (!emailRegex.test(email)) {
        return { error: 'Please enter a valid email address (e.g. name@domain.com).' }
    }

    const siteUrl = getSiteUrl()
    const isSafeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') && !next.startsWith('/signup') && !next.startsWith('/auth/')
    const redirectUrl = isSafeNext
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
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many')) {
            return { error: 'Too many requests. Please wait a few minutes before trying again.' }
        }
        if (msg.includes('fetch failed') || msg.includes('network')) {
            return { error: 'Network error. Please check your internet connection and try again.' }
        }
        return { error: error.message || 'Failed to send magic link. Please try again.' }
    }

    return { success: 'Magic link sent! Please check your inbox and spam folder.' }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}




