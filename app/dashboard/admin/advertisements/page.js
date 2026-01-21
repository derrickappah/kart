import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import AdvertisementsClient from './AdvertisementsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAdvertisementsPage({ searchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get filter from search params
    const resolvedSearchParams = await searchParams;
    const statusFilter = resolvedSearchParams?.status || 'all';
    const adTypeFilter = resolvedSearchParams?.type || 'all';

    // Build query
    let query = supabase
        .from('advertisements')
        .select('*, product:products(id, title, image_url), seller:profiles!seller_id(email, display_name)')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    // Apply ad type filter
    if (adTypeFilter !== 'all') {
        query = query.eq('ad_type', adTypeFilter);
    }

    const { data: advertisements, error } = await query;

    // Calculate stats
    const totalCount = advertisements?.length || 0;
    const activeCount = advertisements?.filter(a => a.status === 'Active').length || 0;
    const pausedCount = advertisements?.filter(a => a.status === 'Paused').length || 0;
    const expiredCount = advertisements?.filter(a => a.status === 'Expired').length || 0;
    const cancelledCount = advertisements?.filter(a => a.status === 'Cancelled').length || 0;
    const totalRevenue = advertisements?.reduce((sum, ad) => sum + parseFloat(ad.cost || 0), 0) || 0;
    const totalViews = advertisements?.reduce((sum, ad) => sum + (ad.views || 0), 0) || 0;
    const totalClicks = advertisements?.reduce((sum, ad) => sum + (ad.clicks || 0), 0) || 0;

    return (
        <div className="space-y-8 pb-12">

            <AdvertisementsClient
                initialAdvertisements={advertisements || []}
                stats={{
                    total: totalCount,
                    active: activeCount,
                    paused: pausedCount,
                    expired: expiredCount,
                    cancelled: cancelledCount,
                    revenue: totalRevenue,
                    views: totalViews,
                    clicks: totalClicks
                }}
            />
        </div>
    );
}
