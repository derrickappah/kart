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
        .select('*, plan:subscription_plans(*)')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: rawSubscriptions, error } = await query;
    let subscriptions = rawSubscriptions || [];

    // Manually fetch profiles since the foreign key relationship might be missing
    if (subscriptions.length > 0) {
        const userIds = [...new Set(subscriptions.map(s => s.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, display_name')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        subscriptions = subscriptions.map(sub => ({
            ...sub,
            user: profileMap.get(sub.user_id) || null
        }));
    }

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
        <div className="space-y-8 pb-12">

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
                statusFilter={statusFilter}
                searchQuery={searchQuery}
            />
        </div>
    );
}
