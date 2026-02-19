import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[Admin Check API] Auth error:', authError);
            return NextResponse.json(
                {
                    isAdmin: false,
                    error: 'Not authenticated',
                    userId: null,
                    email: null
                },
                { status: 401 }
            );
        }

        console.log('[Admin Check API] Checking admin status for user:', { id: user.id, email: user.email });

        // Use SERVICE ROLE to bypass RLS for this specific check
        // This ensures we can always read the is_admin status even if RLS is broken
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('is_admin, email')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[Admin Check API] Admin query error:', profileError);
            return NextResponse.json(
                {
                    isAdmin: false,
                    error: profileError.message || 'Profile not found',
                    userId: user.id,
                    email: user.email,
                    errorCode: profileError.code,
                },
                { status: 404 }
            );
        }

        const isAdmin = profile?.is_admin === true;

        console.log('[Admin Check API] Admin status (Service Role):', {
            userId: user.id,
            email: profile?.email || user.email,
            isAdmin
        });

        return NextResponse.json({
            isAdmin,
            userId: user.id,
            email: profile?.email || user.email,
            method: 'service-role-query',
        });
    } catch (error) {
        console.error('[Admin Check API] Unexpected error:', error);
        return NextResponse.json(
            {
                isAdmin: false,
                error: error.message || 'Server error',
            },
            { status: 500 }
        );
    }
}
