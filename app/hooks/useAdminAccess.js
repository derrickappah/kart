'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export function useAdminAccess(redirectToLogin = true) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAccess = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1. Get current user
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (!currentUser) {
                    if (redirectToLogin) {
                        router.push('/login');
                    }
                    setLoading(false);
                    return;
                }

                setUser(currentUser);

                console.log('[useAdminAccess] Checking RLS profile...');
                // 2. Check admin status locally first (optimistic)
                // Note: This relies on RLS policies allowing the read
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', currentUser.id)
                    .single();

                console.log('[useAdminAccess] RLS Result:', { profile, error: profileError });

                if (profile && profile.is_admin) {
                    console.log('[useAdminAccess] RLS confirmed admin access');
                    setIsAdmin(true);
                } else {
                    console.warn('[useAdminAccess] RLS check failed or not admin. Trying API fallback...');
                    // Fallback to API if RLS fails (e.g. user has no read access to their own is_admin flag)
                    try {
                        const apiResponse = await fetch('/api/admin/check-access');
                        const apiData = await apiResponse.json();

                        if (apiResponse.ok && apiData.isAdmin) {
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(false);
                            if (apiData.error && apiData.error !== 'Not authenticated') {
                                setError(apiData.error);
                            }
                        }
                    } catch (apiErr) {
                        console.error('[useAdminAccess] API Fetch Error:', apiErr);
                        setIsAdmin(false);
                    }
                }

            } catch (err) {
                console.error('[useAdminAccess] Critical Error:', err);
                setError(err.message || 'An unexpected error occurred');
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [router, supabase, redirectToLogin]);

    return { isAdmin, loading, error, user };
}
