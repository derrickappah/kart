import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import VerificationsClient from './VerificationsClient';

export default async function AdminVerificationsPage({ searchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Admin check is handled by layout
    // Get filter from search params
    const resolvedSearchParams = await searchParams;
    const statusFilter = resolvedSearchParams?.status || 'all';

    // Build query - fetch verification requests
    let query = supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: verifications, error } = await query;

    // Fetch user profiles for each verification request
    let verificationsWithUsers = [];
    if (verifications && verifications.length > 0) {
        const userIds = [...new Set(verifications.map(v => v.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, display_name, is_verified')
            .in('id', userIds);

        // Map profiles to verifications
        verificationsWithUsers = verifications.map(verification => ({
            ...verification,
            user: profiles?.find(p => p.id === verification.user_id) || null
        }));
    }

    if (error) {
        console.error('Error fetching verification requests:', error);
    }

    // Calculate stats
    const totalCount = verificationsWithUsers?.length || 0;
    const pendingCount = verificationsWithUsers?.filter(v => v.status === 'Pending').length || 0;
    const approvedCount = verificationsWithUsers?.filter(v => v.status === 'Approved').length || 0;
    const rejectedCount = verificationsWithUsers?.filter(v => v.status === 'Rejected').length || 0;

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1 className={styles.title}>Verification Requests</h1>
                <p className={styles.subtitle}>Review and manage user verification requests</p>
            </header>
            {error && (
                <div style={{ 
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.15) 100%)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '12px', 
                    padding: '1rem 1.5rem',
                    marginBottom: '2rem',
                    color: '#fca5a5',
                    backdropFilter: 'blur(10px)'
                }}>
                    Error loading verification requests: {error.message}
                </div>
            )}
            <VerificationsClient 
                initialVerifications={verificationsWithUsers || []}
                stats={{
                    total: totalCount,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount
                }}
            />
        </div>
    );
}
