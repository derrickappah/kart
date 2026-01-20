import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function PromotionDetailsPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
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
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

                {/* Header Section */}
                <header className="sticky top-0 z-[70] bg-white/95 dark:bg-[#131d1f]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center p-4 justify-between w-full">
                        <Link
                            href="/dashboard/seller/promotions"
                            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back_ios_new</span>
                        </Link>
                        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-slate-900 dark:text-white">Promotion Details</h1>
                    </div>
                </header>

                <main className="flex-1 px-4 py-8 space-y-8 pb-32 overflow-y-auto no-scrollbar">

                    {/* Item Card */}
                    <Link href={`/marketplace/${ad.product_id}`} className="bg-white dark:bg-[#1e292b] rounded-3xl p-6 shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center text-center gap-4 group active:scale-[0.98] transition-all">
                        <div className="size-32 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative border border-transparent dark:border-white/5 shadow-inner">
                            {ad.product?.image_url ? (
                                <Image src={ad.product.image_url} alt={ad.product.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                    <span className="material-symbols-outlined text-4xl">image</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 w-full">
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 ${ad.ad_type === 'Featured' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                {ad.ad_type} Promotion
                            </span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white line-clamp-2">{ad.product?.title || 'Unknown Item'}</h2>
                            <p className="text-lg font-bold text-primary">₵{parseFloat(ad.product?.price || 0).toFixed(2)}</p>
                        </div>
                    </Link>

                    {/* Stats Highlights */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                                <span className="material-symbols-outlined fill-1">visibility</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Views</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{ad.views || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl shadow-soft border border-transparent dark:border-white/5 flex flex-col items-center">
                            <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 text-orange-500">
                                <span className="material-symbols-outlined fill-1">touch_app</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Total Clicks</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{ad.clicks || 0}</p>
                        </div>
                    </section>

                    {/* Campaign Info Card */}
                    <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">info</span>
                            Campaign Information
                        </h3>
                        <div className="space-y-3 px-1">
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${ad.status === 'Active' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500'}`}>{ad.status}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Started</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(ad.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ends</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{new Date(ad.end_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cost</span>
                                <span className="text-xs font-black text-primary uppercase leading-none">₵{parseFloat(ad.cost || 0).toFixed(0)} GHS</span>
                            </div>
                        </div>
                    </section>

                    {/* Performance History Chart Placeholder */}
                    <section className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 shadow-soft border border-transparent dark:border-white/5">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Performance over time</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Views & Clicks breakdown</p>
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <div className="h-44 w-full relative group">
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="border-t border-slate-100 dark:border-white/5 w-full h-0"></div>
                                    ))}
                                </div>
                                <svg className="w-full h-full z-10 relative overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 50">
                                    <path
                                        d={`M ${chartData.map((d, i) => `${(i / (chartData.length - 1)) * 100},${50 - (Math.min(45, d.views * 2))}`).join(' L ')}`}
                                        fill="none" stroke="#1daddd" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                                    />
                                    {chartData.map((d, i) => (
                                        <circle
                                            key={i}
                                            className="fill-white dark:fill-[#1e292b] stroke-primary stroke-[2px] transition-all group-hover:r-[3px]"
                                            cx={(i / (chartData.length - 1)) * 100}
                                            cy={50 - (Math.min(45, d.views * 2))}
                                            r="2.5"
                                        />
                                    ))}
                                </svg>
                                <div className="flex justify-between mt-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                                    <span>{chartData[0].day}</span>
                                    <span>{chartData[chartData.length - 1].day}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-300 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">analytics</span>
                                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting more data</p>
                            </div>
                        )}
                    </section>

                </main>
            </div>
        </div>
    );
}
