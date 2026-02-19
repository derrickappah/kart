import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import ProductModerationClient from './ProductModerationClient';

export default async function AdminProductsPage({ searchParams }) {
    // Await params
    const sParams = await searchParams;
    const q = sParams?.q;
    const category = sParams?.category;
    const status = sParams?.status;
    const minPrice = sParams?.minPrice;
    const maxPrice = sParams?.maxPrice;

    const supabase = await createClient();

    // Auth check (admin check is handled by layout)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch Products (With basic filtering)
    let query = supabase
        .from('products')
        .select('*, seller:profiles(email)')
        .order('created_at', { ascending: false });

    if (q) {
        query = query.ilike('title', `%${q}%`);
    }

    if (category) {
        query = query.eq('category', category);
    }

    if (status) {
        query = query.eq('status', status);
    }

    if (minPrice) {
        query = query.gte('price', parseFloat(minPrice));
    }

    if (maxPrice) {
        query = query.lte('price', parseFloat(maxPrice));
    }

    const { data: products } = await query;

    // Calculate stats globally (or at least consistently)
    // To fix the "Filtered Stats Bug", we should ideally fetch these without the 'q' filter
    const { data: allProducts } = await supabase.from('products').select('status');

    const stats = {
        total: allProducts?.length || 0,
        active: allProducts?.filter(p => p.status === 'Active').length || 0,
        banned: allProducts?.filter(p => p.status === 'Banned').length || 0,
        pending: allProducts?.filter(p => p.status === 'Pending').length || 0
    };

    return (
        <div className="space-y-8">

            <ProductModerationClient
                initialProducts={products || []}
                stats={stats}
            />
        </div>
    );
}

