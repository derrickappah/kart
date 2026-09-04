import { createClient, createServiceRoleClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import ProductModerationClient from './ProductModerationClient';

export default async function AdminProductsPage({ searchParams }) {
    const sParams = await searchParams;
    const q = sParams?.q ? sParams.q.trim() : '';
    const category = sParams?.category || '';
    const status = sParams?.status || '';
    const minPrice = sParams?.minPrice || '';
    const maxPrice = sParams?.maxPrice || '';
    const sort = sParams?.sort || 'newest';
    const page = Math.max(1, parseInt(sParams?.page || '1', 10));
    const pageSize = 20;

    const supabase = await createClient();

    // Auth verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const adminSupabase = createServiceRoleClient();

    // Fetch system-wide status counts for KPI widgets
    const { data: allProducts } = await adminSupabase
        .from('products')
        .select('status');

    const stats = {
        total: allProducts?.length || 0,
        active: allProducts?.filter(p => p.status === 'Active').length || 0,
        pending: allProducts?.filter(p => p.status === 'Pending').length || 0,
        banned: allProducts?.filter(p => p.status === 'Banned').length || 0,
        sold: allProducts?.filter(p => p.status === 'Sold').length || 0
    };

    // Filtered products query with joined seller profile info
    let query = adminSupabase
        .from('products')
        .select('*, seller:profiles(id, email, display_name, avatar_url, campus, is_verified)', { count: 'exact' });

    if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    if (category) {
        query = query.eq('category', category);
    }

    if (status) {
        query = query.eq('status', status);
    }

    if (minPrice && !isNaN(parseFloat(minPrice))) {
        query = query.gte('price', parseFloat(minPrice));
    }

    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        query = query.lte('price', parseFloat(maxPrice));
    }

    // Apply sorting
    if (sort === 'oldest') {
        query = query.order('created_at', { ascending: true });
    } else if (sort === 'price_asc') {
        query = query.order('price', { ascending: true });
    } else if (sort === 'price_desc') {
        query = query.order('price', { ascending: false });
    } else {
        // default newest
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: products, count: totalFiltered, error } = await query;

    if (error) {
        console.error('Error fetching admin products:', error);
    }

    return (
        <div className="space-y-6">
            <ProductModerationClient
                initialProducts={products || []}
                stats={stats}
                totalFiltered={totalFiltered ?? (products?.length || 0)}
                currentPage={page}
                pageSize={pageSize}
                currentFilters={{
                    q,
                    category,
                    status,
                    minPrice,
                    maxPrice,
                    sort
                }}
            />
        </div>
    );
}

