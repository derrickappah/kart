import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

        // Check admin status from database
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, email')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[Admin Check API] Profile query error:', profileError);
            
            // Try without .single() as fallback
            const { data: profilesArray, error: arrayError } = await supabase
                .from('profiles')
                .select('is_admin, email')
                .eq('id', user.id)
                .limit(1);

            if (arrayError || !profilesArray || profilesArray.length === 0) {
                return NextResponse.json(
                    {
                        isAdmin: false,
                        error: profileError?.message || arrayError?.message || 'Profile not found',
                        userId: user.id,
                        email: user.email,
                        errorCode: profileError?.code || arrayError?.code,
                    },
                    { status: 404 }
                );
            }

            const profile = profilesArray[0];
            const isAdmin = profile.is_admin === true;

            console.log('[Admin Check API] Fallback query succeeded:', { isAdmin, email: profile.email });

            return NextResponse.json({
                isAdmin,
                userId: user.id,
                email: profile.email || user.email,
                method: 'fallback-query',
            });
        }

        const isAdmin = profile?.is_admin === true;

        console.log('[Admin Check API] Admin status:', { 
            userId: user.id, 
            email: profile?.email || user.email,
            isAdmin 
        });

        return NextResponse.json({
            isAdmin,
            userId: user.id,
            email: profile?.email || user.email,
            method: 'direct-query',
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
