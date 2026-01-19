'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function AdminAccessCheck({ children }) {
    const [checking, setChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    router.push('/login');
                    return;
                }

                // Check admin status directly from database
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error checking admin status:', error);
                    setHasAccess(false);
                    setChecking(false);
                    return;
                }

                if (profile && profile.is_admin) {
                    setHasAccess(true);
                } else {
                    setHasAccess(false);
                }
            } catch (err) {
                console.error('Error in admin check:', err);
                setHasAccess(false);
            } finally {
                setChecking(false);
            }
        };

        checkAdminAccess();
    }, [router, supabase]);

    if (checking) {
        return (
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                minHeight: '50vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '1.5rem' }}>⏳</div>
                <p style={{ color: 'var(--text-muted)' }}>Checking admin access...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div style={{ 
                textAlign: 'center', 
                padding: '4rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}>
                <h1 style={{ color: '#ef4444', fontSize: '2rem' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    You do not have permission to view this page.
                </p>
                <div style={{ 
                    background: '#fef3c7', 
                    border: '1px solid #f59e0b', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '1rem',
                    maxWidth: '500px',
                    textAlign: 'left'
                }}>
                    <p style={{ color: '#92400e', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>If you believe you should have admin access:</strong>
                    </p>
                    <ol style={{ color: '#92400e', fontSize: '0.875rem', paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Log out and log back in to refresh your session</li>
                        <li>Clear your browser cache and cookies</li>
                        <li>Contact the system administrator to verify your admin status</li>
                    </ol>
                </div>
                <button
                    onClick={() => {
                        supabase.auth.signOut().then(() => {
                            router.push('/login');
                        });
                    }}
                    style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontWeight: '600',
                    }}
                >
                    Log Out
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
