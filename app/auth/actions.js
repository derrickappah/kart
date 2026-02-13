'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
