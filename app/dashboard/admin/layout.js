'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function AdminLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [checking, setChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [error, setError] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_ADMIN === 'true';

    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                console.log('[Admin Check] Starting admin access check...');
                
                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                
                if (userError) {
                    console.error('[Admin Check] Error getting user:', userError);
                    setError(`Auth error: ${userError.message}`);
                    setDebugInfo({ step: 'getUser', error: userError.message });
                    router.push('/login');
                    return;
                }
                
                if (!user) {
                    console.log('[Admin Check] No user found, redirecting to login');
                    router.push('/login');
                    return;
                }

                console.log('[Admin Check] User found:', { id: user.id, email: user.email });

                // Method 1: Try direct query with .single()
                let profile = null;
                let queryError = null;
                
                try {
                    const { data, error: err } = await supabase
                        .from('profiles')
                        .select('is_admin, email')
                        .eq('id', user.id)
                        .single();
                    
                    profile = data;
                    queryError = err;
                    
                    if (err) {
                        console.warn('[Admin Check] Direct query with .single() failed:', err);
                        console.log('[Admin Check] Trying fallback: query without .single()');
                        
                        // Method 2: Fallback - query without .single()
                        const { data: profilesArray, error: arrayError } = await supabase
                            .from('profiles')
                            .select('is_admin, email')
                            .eq('id', user.id)
                            .limit(1);
                        
                        if (arrayError) {
                            console.error('[Admin Check] Fallback query also failed:', arrayError);
                            queryError = arrayError;
                        } else if (profilesArray && profilesArray.length > 0) {
                            profile = profilesArray[0];
                            queryError = null;
                            console.log('[Admin Check] Fallback query succeeded');
                        } else {
                            console.warn('[Admin Check] No profile found in fallback query');
                        }
                    } else {
                        console.log('[Admin Check] Direct query succeeded');
                    }
                } catch (queryErr) {
                    console.error('[Admin Check] Query exception:', queryErr);
                    queryError = queryErr;
                }

                // Method 3: If both queries failed, try API route fallback
                if (queryError && !profile) {
                    console.log('[Admin Check] Trying API route fallback...');
                    try {
                        const apiResponse = await fetch('/api/admin/check-access');
                        const apiData = await apiResponse.json();
                        
                        if (apiResponse.ok && apiData.isAdmin !== undefined) {
                            console.log('[Admin Check] API route succeeded:', apiData);
                            setHasAccess(apiData.isAdmin);
                            setDebugInfo({
                                method: 'api-fallback',
                                userId: apiData.userId,
                                email: apiData.email,
                                isAdmin: apiData.isAdmin,
                            });
                            setChecking(false);
                            return;
                        } else {
                            console.error('[Admin Check] API route failed:', apiData);
                            setError(apiData.error || 'API check failed');
                        }
                    } catch (apiErr) {
                        console.error('[Admin Check] API route exception:', apiErr);
                        setError(`API error: ${apiErr.message}`);
                    }
                }

                // Process the result
                if (queryError && !profile) {
                    console.error('[Admin Check] All methods failed. Error:', queryError);
                    setError(queryError.message || 'Failed to check admin status');
                    setDebugInfo({
                        method: 'direct-query',
                        userId: user.id,
                        email: user.email,
                        error: queryError.message || queryError,
                        errorCode: queryError.code,
                        errorDetails: queryError,
                    });
                    setHasAccess(false);
                    setChecking(false);
                    return;
                }

                if (profile) {
                    const isAdmin = profile.is_admin === true;
                    console.log('[Admin Check] Profile found:', { 
                        userId: user.id, 
                        email: profile.email || user.email,
                        is_admin: profile.is_admin,
                        result: isAdmin ? 'GRANTED' : 'DENIED'
                    });
                    
                    setDebugInfo({
                        method: 'direct-query',
                        userId: user.id,
                        email: profile.email || user.email,
                        isAdmin: isAdmin,
                        profileData: profile,
                    });
                    
                    setHasAccess(isAdmin);
                } else {
                    console.warn('[Admin Check] No profile found for user:', user.id);
                    setError('Profile not found');
                    setDebugInfo({
                        method: 'direct-query',
                        userId: user.id,
                        email: user.email,
                        error: 'Profile not found in database',
                    });
                    setHasAccess(false);
                }
            } catch (err) {
                console.error('[Admin Check] Unexpected error:', err);
                setError(err.message || 'Unexpected error occurred');
                setDebugInfo({
                    error: err.message,
                    stack: err.stack,
                });
                setHasAccess(false);
            } finally {
                setChecking(false);
            }
        };

        checkAdminAccess();
    }, [router, supabase, refreshTrigger]);

    const handleRefreshCheck = () => {
        setChecking(true);
        setError(null);
        setDebugInfo(null);
        setHasAccess(false);
        setRefreshTrigger(prev => prev + 1);
    };

    const isActive = (path) => {
        if (path === '/dashboard/admin') {
            return pathname === '/dashboard/admin';
        }
        return pathname?.startsWith(path);
    };

    const getNavIcon = (path) => {
        const icons = {
            '/dashboard/admin': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/users': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/verifications': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/subscriptions': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 10H21M7 15H7.01M11 15H11.01M3 19H21C21.5523 19 22 18.5523 22 18V6C22 5.44772 21.5523 5 21 5H3C2.44772 5 2 5.44772 2 6V18C2 18.5523 2.44772 19 3 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/products': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/reviews': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/advertisements': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 5H6C4.89543 5 4 5.89543 4 7V18C4 19.1046 4.89543 20 6 20H17C18.1046 20 19 19.1046 19 18V13M18 5L13 10M18 5H14M18 5V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/orders': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15M9 12H9.01M9 16H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/withdrawals': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V16M8 12H16M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
            '/dashboard/admin/reports': (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ),
        };
        return icons[path] || icons['/dashboard/admin'];
    };

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
                gap: '1rem',
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                <h1 style={{ color: '#ef4444', fontSize: '2rem' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    You do not have permission to view this page.
                </p>

                {/* Debug Information */}
                {isDebugMode && debugInfo && (
                    <div style={{ 
                        background: '#1e293b', 
                        border: '1px solid #334155', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '1.5rem',
                        maxWidth: '100%',
                        textAlign: 'left',
                        color: '#e2e8f0',
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                        overflow: 'auto'
                    }}>
                        <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#fbbf24' }}>Debug Information:</p>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div style={{ 
                        background: '#fee2e2', 
                        border: '1px solid #fca5a5', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '1rem',
                        maxWidth: '100%',
                        textAlign: 'left'
                    }}>
                        <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: 0 }}>
                            <strong>Error:</strong> {error}
                        </p>
                    </div>
                )}

                <div style={{ 
                    background: '#fef3c7', 
                    border: '1px solid #f59e0b', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '1rem',
                    maxWidth: '100%',
                    textAlign: 'left'
                }}>
                    <p style={{ color: '#92400e', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>If you believe you should have admin access:</strong>
                    </p>
                    <ol style={{ color: '#92400e', fontSize: '0.875rem', paddingLeft: '1.5rem', margin: 0 }}>
                        <li>Click "Refresh Admin Status" below to re-check</li>
                        <li>Log out and log back in to refresh your session</li>
                        <li>Clear your browser cache and cookies</li>
                        <li>Contact the system administrator to verify your admin status</li>
                    </ol>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        onClick={handleRefreshCheck}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: '600',
                        }}
                    >
                        🔄 Refresh Admin Status
                    </button>
                    <button
                        onClick={() => {
                            supabase.auth.signOut().then(() => {
                                router.push('/login');
                            });
                        }}
                        style={{
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
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-[#1a1c23]">
            {/* Admin Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#2d2d32] border-r border-gray-100 dark:border-gray-800 shrink-0">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">Management Tools</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-1">
                        <Link href="/" className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Back to Home
                        </Link>
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Overview</p>
                        <Link href="/dashboard/admin" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isActive('/dashboard/admin') ? 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20' : 'text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                            {getNavIcon('/dashboard/admin')}
                            Dashboard
                        </Link>
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">User Management</p>
                        {[
                            { href: '/dashboard/admin/users', label: 'Users', path: '/dashboard/admin/users' },
                            { href: '/dashboard/admin/verifications', label: 'Verifications', path: '/dashboard/admin/verifications' },
                            { href: '/dashboard/admin/subscriptions', label: 'Subscriptions', path: '/dashboard/admin/subscriptions' }
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isActive(item.path) ? 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20' : 'text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                {getNavIcon(item.path)}
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Content</p>
                        {[
                            { href: '/dashboard/admin/products', label: 'Products', path: '/dashboard/admin/products' },
                            { href: '/dashboard/admin/reviews', label: 'Reviews', path: '/dashboard/admin/reviews' },
                            { href: '/dashboard/admin/advertisements', label: 'Advertisements', path: '/dashboard/admin/advertisements' }
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isActive(item.path) ? 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20' : 'text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                {getNavIcon(item.path)}
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transactions</p>
                        {[
                            { href: '/dashboard/admin/orders', label: 'Orders', path: '/dashboard/admin/orders' },
                            { href: '/dashboard/admin/withdrawals', label: 'Withdrawals', path: '/dashboard/admin/withdrawals' }
                        ].map((item) => (
                            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isActive(item.path) ? 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20' : 'text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                {getNavIcon(item.path)}
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Moderation</p>
                        <Link href="/dashboard/admin/reports" className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isActive('/dashboard/admin/reports') ? 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20' : 'text-gray-500 hover:text-[#1daddd] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                            {getNavIcon('/dashboard/admin/reports')}
                            Reports
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Admin Content Area */}
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    );
}
