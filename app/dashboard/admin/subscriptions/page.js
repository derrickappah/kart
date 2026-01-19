import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import SubscriptionsClient from './SubscriptionsClient';

export default async function AdminSubscriptionsPage({ searchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Admin check is handled by layout
    // Get filter from search params
    const resolvedSearchParams = await searchParams;
    const statusFilter = resolvedSearchParams?.status || 'all';
    const searchQuery = resolvedSearchParams?.q || '';

    // Build query
    let query = supabase
        .from('subscriptions')
        .select('*, plan:subscription_plans(*), user:profiles!user_id(email, display_name)')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    // Apply search filter (by email)
    if (searchQuery) {
        // We need to filter by user email, so we'll fetch all and filter client-side
        // Or use a more complex query with joins
    }

    const { data: subscriptions, error } = await query;

    // Filter by search query if provided (client-side filtering for email)
    let filteredSubscriptions = subscriptions || [];
    if (searchQuery && subscriptions) {
        filteredSubscriptions = subscriptions.filter(sub => 
            sub.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    // Calculate stats
    const totalCount = filteredSubscriptions?.length || 0;
    const activeCount = filteredSubscriptions?.filter(s => s.status === 'Active').length || 0;
    const pendingCount = filteredSubscriptions?.filter(s => s.status === 'Pending').length || 0;
    const expiredCount = filteredSubscriptions?.filter(s => s.status === 'Expired').length || 0;
    const cancelledCount = filteredSubscriptions?.filter(s => s.status === 'Cancelled').length || 0;

    // Calculate total revenue from active subscriptions
    const totalRevenue = filteredSubscriptions
        ?.filter(s => s.status === 'Active')
        .reduce((sum, sub) => sum + parseFloat(sub.plan?.price || 0), 0) || 0;

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1 className={styles.title}>Subscriptions Management</h1>
                <p className={styles.subtitle}>Manage and monitor all platform subscriptions</p>
            </header>
            <SubscriptionsClient 
                initialSubscriptions={filteredSubscriptions || []}
                stats={{
                    total: totalCount,
                    active: activeCount,
                    pending: pendingCount,
                    expired: expiredCount,
                    cancelled: cancelledCount,
                    revenue: totalRevenue
                }}
            />
        </div>
    );
}
