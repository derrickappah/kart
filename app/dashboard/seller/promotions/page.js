import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function PromotionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch advertisements for this seller
    console.log('[PromotionsPage] Fetching advertisements for user:', user.id);
    const { data: advertisements, error } = await supabase
        .from('advertisements')
        .select(`
            *,
            product:products(id, title, image_url, price)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching advertisements:', error);
    }

    const ads = advertisements || [];
    const activeAds = ads.filter(ad => ad.status === 'Active');
    const totalSpent = ads.reduce((sum, ad) => sum + parseFloat(ad.cost || 0), 0);
    const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

                {/* Header Section */}
                <header className="sticky top-0 z-[70] bg-white/95 dark:bg-[#131d1f]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center p-4 justify-between w-full">
                        <Link
                            href="/dashboard/seller"
                            className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back_ios_new</span>
                        </Link>
                        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-slate-900 dark:text-white">Promotions</h1>
                    </div>
                </header>

                <main className="flex-1 px-4 py-8 space-y-6 pb-32 overflow-y-auto no-scrollbar">

                    {/* Activity Overview */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Active Promos</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{activeAds.length}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Total Spent</span>
                            <p className="text-2xl font-black text-primary">₵{totalSpent.toFixed(0)}</p>
                        </div>
                        <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Total Views</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalViews}</span>
                                <span className="material-symbols-outlined text-primary text-sm font-bold">visibility</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1e292b] p-5 rounded-2xl shadow-soft border border-transparent dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 block">Total Clicks</span>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{totalClicks}</span>
                                <span className="material-symbols-outlined text-[#ff9f0f] text-sm font-bold">touch_app</span>
                            </div>
                        </div>
                    </section>

                    {/* Promotions List */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Current & Past Promos</h3>

                        {ads.length > 0 ? (
                            ads.map(ad => (
                                <div key={ad.id} className="bg-white dark:bg-[#1e292b] rounded-2xl overflow-hidden shadow-soft border border-transparent dark:border-white/5 flex flex-col group active:scale-[0.99] transition-all">
                                    <Link href={`/dashboard/seller/promotions/${ad.id}`} className="p-4 flex items-center gap-4">
                                        <div className="size-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden relative border border-transparent dark:border-white/5">
                                            {ad.product?.image_url ? (
                                                <Image src={ad.product.image_url} alt={ad.product.title} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                    <span className="material-symbols-outlined text-2xl">image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${ad.ad_type === 'Featured' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                                    }`}>
                                                    {ad.ad_type}
                                                </span>
                                                <div className={`size-1.5 rounded-full ${ad.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{ad.status}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm mb-0.5">{ad.product?.title || 'Unknown Item'}</h4>
                                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500">
                                                Ends {new Date(ad.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="size-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                                        </div>
                                    </Link>

                                    {/* Stats Bar */}
                                    <div className="bg-slate-50/50 dark:bg-white/5 grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5 border-t border-slate-100 dark:border-white/5">
                                        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Views</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{ad.views || 0}</span>
                                        </div>
                                        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Clicks</span>
                                            <span className="text-sm font-black text-slate-900 dark:text-white">{ad.clicks || 0}</span>
                                        </div>
                                        <div className="py-2.5 flex flex-col items-center justify-center gap-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Cost</span>
                                            <span className="text-sm font-black text-primary">₵{parseFloat(ad.cost || 0).toFixed(0)}</span>
                                        </div>
                                    </div>

                                    <Link href={`/marketplace/${ad.product_id}`} className="py-2.5 text-center text-[11px] font-bold text-slate-400 hover:text-primary transition-colors border-t border-slate-100 dark:divide-white/5 uppercase tracking-widest">
                                        View Live Item
                                    </Link>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 bg-white dark:bg-[#1e292b] rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5 shadow-soft">
                                <div className="size-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-3xl text-slate-200 dark:text-slate-700">rocket_launch</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">No promotions yet</p>
                                <Link href="/dashboard/seller/listings" className="text-primary text-[11px] font-bold uppercase tracking-widest mt-2 inline-block hover:underline">Pick an item to boost</Link>
                            </div>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
}
