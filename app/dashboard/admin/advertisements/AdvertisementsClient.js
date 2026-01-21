'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AdvertisementsClient({ initialAdvertisements, stats = {} }) {
    const [advertisements, setAdvertisements] = useState(initialAdvertisements);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const currentStatusFilter = searchParams?.get('status') || 'all';
    const currentTypeFilter = searchParams?.get('type') || 'all';

    const handleFilterChange = (filterType, value) => {
        const params = new URLSearchParams();

        // Handle status filter
        if (filterType === 'status') {
            if (value !== 'all') {
                params.set('status', value);
            }
            // Keep type filter if it exists
            if (currentTypeFilter !== 'all') {
                params.set('type', currentTypeFilter);
            }
        }

        // Handle type filter
        if (filterType === 'type') {
            if (value !== 'all') {
                params.set('type', value);
            }
            // Keep status filter if it exists
            if (currentStatusFilter !== 'all') {
                params.set('status', currentStatusFilter);
            }
        }

        router.push(`/dashboard/admin/advertisements?${params.toString()}`);
    };

    const handlePause = async (adId) => {
        if (!confirm('Are you sure you want to pause this advertisement?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('advertisements')
                .update({ status: 'Paused', updated_at: new Date().toISOString() })
                .eq('id', adId);

            if (error) throw error;

            setAdvertisements(prev => prev.map(ad =>
                ad.id === adId ? { ...ad, status: 'Paused' } : ad
            ));
        } catch (err) {
            alert('Error pausing advertisement: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async (adId) => {
        if (!confirm('Are you sure you want to resume this advertisement?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('advertisements')
                .update({ status: 'Active', updated_at: new Date().toISOString() })
                .eq('id', adId);

            if (error) throw error;

            setAdvertisements(prev => prev.map(ad =>
                ad.id === adId ? { ...ad, status: 'Active' } : ad
            ));
        } catch (err) {
            alert('Error resuming advertisement: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const adTypeLabels = {
        Featured: 'Featured Product',
        Boost: 'Boost Listing',
        'Featured Seller': 'Featured Seller',
        'Campus Ad': 'Campus Ad',
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Paused': return styles.statusPaused;
            case 'Expired': return styles.statusExpired;
            case 'Cancelled': return styles.statusCancelled;
            default: return styles.statusActive;
        }
    };

    // Calculate CTR (Click-Through Rate)
    const calculateCTR = (ad) => {
        if (!ad.views || ad.views === 0) return '0.00%';
        return ((ad.clicks / ad.views) * 100).toFixed(2) + '%';
    };

    return (
        <div className="space-y-8">
            {/* Growth Pulse Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Active Campaigns', value: stats.active, color: 'green-500', icon: 'campaign', sub: 'Live impressions' },
                    { label: 'Total Engagement', value: stats.clicks, color: 'primary', icon: 'touch_app', sub: `${stats.views} total views` },
                    { label: 'Ad Revenue', value: `GH₵ ${stats.revenue?.toFixed(2)}`, color: 'amber-500', icon: 'payments', sub: 'Cumulative billing' },
                    { label: 'Avg CTR', value: stats.views > 0 ? ((stats.clicks / stats.views) * 100).toFixed(2) + '%' : '0.00%', color: 'blue-500', icon: 'query_stats', sub: 'Conversion efficiency' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm transform hover:-translate-y-1 transition-all">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                                stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                                    stat.color === 'amber-500' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-blue-500/10 text-blue-500'
                                }`}>
                                <span className="material-symbols-outlined text-[24px] font-bold">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                                <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Campaign Controls */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-6 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] ml-2">Lifecycle Status</p>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'Active', 'Paused', 'Expired', 'Cancelled'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleFilterChange('status', status)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStatusFilter === status
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                                        }`}
                                >
                                    {status === 'all' ? 'All Lifecycle' : status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-12 w-px bg-[#dce3e5] dark:bg-[#2d3b41] hidden md:block"></div>

                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] ml-2">Inventory Type</p>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'Featured', 'Boost', 'Featured Seller', 'Campus Ad'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => handleFilterChange('type', type)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTypeFilter === type
                                        ? 'bg-[#111618] dark:bg-white text-white dark:text-[#111618]'
                                        : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                                        }`}
                                >
                                    {type === 'all' ? 'All Tiers' : adTypeLabels[type] || type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Intelligence Grid */}
            {advertisements.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                        <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">campaign</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">No Active Bids</h3>
                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">No advertisement placement records match your current organizational filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {advertisements.map((ad) => (
                        <div key={ad.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col md:flex-row group hover:border-primary/30 transition-all shadow-sm">
                            <div className="w-full md:w-48 h-48 md:h-auto relative bg-background-light dark:bg-[#212b30]/30 shrink-0">
                                {ad.product?.image_url ? (
                                    <img src={ad.product.image_url} alt={ad.product.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-[#4b636c]/20">image</span>
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#111618]/80 backdrop-blur-md text-[8px] font-black uppercase tracking-widest text-white">
                                    {adTypeLabels[ad.ad_type] || ad.ad_type}
                                </div>
                            </div>

                            <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary">Target Item</h4>
                                        <div className="flex items-center gap-1.5">
                                            {ad.status === 'Active' ? (
                                                <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            ) : (
                                                <span className="size-1.5 bg-[#4b636c] rounded-full"></span>
                                            )}
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${ad.status === 'Active' ? 'text-green-500' : 'text-[#4b636c]'}`}>
                                                {ad.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-base font-black tracking-tighter uppercase line-clamp-1">{ad.product?.title || 'Unknown Placement'}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4 bg-white/30 dark:bg-[#111618]/30 p-3 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                                    <div className="text-center border-r border-[#dce3e5] dark:border-[#2d3b41]">
                                        <p className="text-[8px] font-black uppercase text-[#4b636c] mb-1">Views</p>
                                        <p className="text-xs font-black">{ad.views || 0}</p>
                                    </div>
                                    <div className="text-center border-r border-[#dce3e5] dark:border-[#2d3b41]">
                                        <p className="text-[8px] font-black uppercase text-[#4b636c] mb-1">Clicks</p>
                                        <p className="text-xs font-black">{ad.clicks || 0}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-[#4b636c] mb-1">CTR</p>
                                        <p className="text-xs font-black text-primary">{calculateCTR(ad)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                        <span>{new Date(ad.start_date).toLocaleDateString()} — {new Date(ad.end_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-primary">
                                        GH₵ {parseFloat(ad.cost || 0).toFixed(2)}
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="size-7 rounded-full bg-[#111618] dark:bg-white text-white dark:text-[#111618] flex items-center justify-center text-[10px] font-black shrink-0">
                                            {ad.seller?.display_name?.charAt(0) || 'S'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-tighter truncate opacity-70 text-[#4b636c]">{ad.seller?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {ad.status === 'Active' ? (
                                            <button onClick={() => handlePause(ad.id)} className="size-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">pause</span>
                                            </button>
                                        ) : ad.status === 'Paused' ? (
                                            <button onClick={() => handleResume(ad.id)} className="size-8 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                            </button>
                                        ) : null}
                                        <button className="size-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[18px]">analytics</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {}; // Dummy styles to satisfy existing references
