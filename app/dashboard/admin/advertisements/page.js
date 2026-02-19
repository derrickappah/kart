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
        .select('*')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    // Apply ad type filter
    if (adTypeFilter !== 'all') {
        query = query.eq('ad_type', adTypeFilter);
    }

    const { data: rawAds, error } = await query;
    let advertisements = rawAds || [];

    // Manually fetch related data
    if (advertisements.length > 0) {
        const productIds = [...new Set(advertisements.map(a => a.product_id).filter(Boolean))];
        const sellerIds = [...new Set(advertisements.map(a => a.seller_id).filter(Boolean))];

        const [productsResult, profilesResult] = await Promise.all([
            productIds.length > 0 ? supabase.from('products').select('id, title, image_url').in('id', productIds) : { data: [] },
            sellerIds.length > 0 ? supabase.from('profiles').select('id, email, display_name').in('id', sellerIds) : { data: [] }
        ]);

        const products = productsResult.data || [];
        const profiles = profilesResult.data || [];

        const productMap = new Map(products.map(p => [p.id, p]));
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        advertisements = advertisements.map(ad => ({
            ...ad,
            product: productMap.get(ad.product_id) || null,
            seller: profileMap.get(ad.seller_id) || null
        }));
    }

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
