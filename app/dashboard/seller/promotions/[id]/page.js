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

    // Fetch daily stats from ad_campaigns
    const { data: dailyStatsRaw } = await supabase
        .from('ad_campaigns')
        .select('event_type, created_at')
        .eq('advertisement_id', id)
        .order('created_at', { ascending: true });

    // Process daily stats
    const statsByDay = (dailyStatsRaw || []).reduce((acc, event) => {
        const day = new Date(event.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!acc[day]) acc[day] = { day, views: 0, clicks: 0 };
        if (event.event_type === 'view') acc[day].views++;
        else if (event.event_type === 'click') acc[day].clicks++;
        return acc;
    }, {});

    const chartData = Object.values(statsByDay);

    return (
        <PromotionDetailsClient ad={ad} chartData={chartData} />
    );
}
