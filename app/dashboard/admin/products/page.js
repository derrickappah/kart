import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import ProductModerationClient from './ProductModerationClient';

export default async function AdminProductsPage({ searchParams }) {
    // Await params
    const { q } = await searchParams;
    const supabase = await createClient();

    // Auth check (admin check is handled by layout)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch Products
    let query = supabase
        .from('products')
        .select('*, seller:profiles(email)')
        .order('created_at', { ascending: false });

    if (q) {
        query = query.ilike('title', `%${q}%`);
    }

    const { data: products, error } = await query;

    // Calculate stats
    const totalCount = products?.length || 0;
    const activeCount = products?.filter(p => p.status === 'Active').length || 0;
    const bannedCount = products?.filter(p => p.status === 'Banned').length || 0;
    const pendingCount = products?.filter(p => p.status === 'Pending').length || 0;

    return (
        <div className="space-y-8">

            <ProductModerationClient
                initialProducts={products || []}
                stats={{
                    total: totalCount,
                    active: activeCount,
                    banned: bannedCount,
                    pending: pendingCount
                }}
            />
        </div>
    );
}

