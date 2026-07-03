import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PromotionDetailsClient from './PromotionDetailsClient';

export const metadata = {
    title: 'Promotion Details | Kart',
    description: 'Detailed campaign metrics, view counts, and engagement performance for your promoted campus listing.',
};

export default async function PromotionDetailsPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Fetch advertisement details
    const { data: ad, error } = await supabase
        .from('advertisements')
        .select(`
            *,
            product:products(*)
        `)
        .eq('id', id)
        .eq('seller_id', user.id)
        .single();

    if (error || !ad) {
        notFound();
    }

    // Fetch daily stats aggregated in-database using RPC (scales beyond 1,000-row limit)
    const { data: chartDataRaw, error: rpcError } = await supabase.rpc('get_ad_daily_stats', { ad_id: id });
    if (rpcError) {
        console.error('Error fetching aggregated daily stats:', rpcError);
    }

    const chartData = (chartDataRaw || []).map(row => ({
        day: row.day,
        views: Number(row.views || 0),
        clicks: Number(row.clicks || 0)
    }));

    return (
        <PromotionDetailsClient ad={ad} chartData={chartData} />
    );
}
