'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

let cachedIsAdmin = null;
let cachedUser = null;
let cachedError = null;
let checkPromise = null;

// Clear cache on authentication state change (e.g. sign out)
if (typeof window !== 'undefined') {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            cachedIsAdmin = null;
            cachedUser = null;
            cachedError = null;
            checkPromise = null;
        }
    });
}

export function useAdminAccess(redirectToLogin = true) {
    const router = useRouter();
    const supabase = createClient();

    const [isAdmin, setIsAdmin] = useState(() => cachedIsAdmin !== null ? cachedIsAdmin : false);
    const [loading, setLoading] = useState(() => cachedIsAdmin !== null ? false : true);
    const [error, setError] = useState(() => cachedError);
    const [user, setUser] = useState(() => cachedUser);

    useEffect(() => {
        if (cachedIsAdmin !== null) {
            setLoading(false);
            return;
        }

        const checkAccess = async () => {
            try {
                setError(null);

                // 1. Get current user
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

                if (authError) throw authError;

                if (!currentUser) {
                    if (redirectToLogin) {
                        router.push('/login');
                    }
                    cachedIsAdmin = false;
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }

                cachedUser = currentUser;
                setUser(currentUser);

                console.log('[useAdminAccess] Checking RLS profile...');
                // 2. Check admin status locally first (optimistic)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', currentUser.id)
                    .single();

                console.log('[useAdminAccess] RLS Result:', { profile, error: profileError });

                let isUserAdmin = false;
                if (profile && profile.is_admin) {
                    console.log('[useAdminAccess] RLS confirmed admin access');
                    isUserAdmin = true;
                } else {
                    console.warn('[useAdminAccess] RLS check failed or not admin. Trying API fallback...');
                    try {
                        const apiResponse = await fetch('/api/admin/check-access');
                        const apiData = await apiResponse.json();

                        if (apiResponse.ok && apiData.isAdmin) {
                            isUserAdmin = true;
                        } else {
                            isUserAdmin = false;
                            if (apiData.error && apiData.error !== 'Not authenticated') {
                                cachedError = apiData.error;
                                setError(apiData.error);
                            }
                        }
                    } catch (apiErr) {
                        console.error('[useAdminAccess] API Fetch Error:', apiErr);
                        isUserAdmin = false;
                    }
                }

                cachedIsAdmin = isUserAdmin;
                setIsAdmin(isUserAdmin);
            } catch (err) {
                console.error('[useAdminAccess] Critical Error:', err);
                const errMsg = err.message || 'An unexpected error occurred';
                cachedError = errMsg;
                setError(errMsg);
                cachedIsAdmin = false;
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        if (!checkPromise) {
            checkPromise = checkAccess();
        } else {
            checkPromise.then(() => {
                setIsAdmin(cachedIsAdmin !== null ? cachedIsAdmin : false);
                setLoading(false);
                setError(cachedError);
                setUser(cachedUser);
            });
        }
    }, [router, supabase, redirectToLogin]);

    return { isAdmin, loading, error, user };
}

