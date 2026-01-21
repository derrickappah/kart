'use client';
import { useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProductModerationClient({ initialProducts, stats = {} }) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e) => {
        e.preventDefault();
        router.push(`/dashboard/admin/products?q=${search}`);
    };

    const updateStatus = async (productId, newStatus) => {
        if (!confirm(`Set status to ${newStatus}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({ status: newStatus })
                .eq('id', productId);

            if (error) throw error;
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteProduct = async (productId) => {
        if (!confirm('PERMANENTLY DELETE this product? This cannot be undone.')) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            router.refresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Active': return styles.statusActive;
            case 'Banned': return styles.statusBanned;
            case 'Pending': return styles.statusPending;
            default: return styles.statusActive;
        }
    };

    return (
        <div className="space-y-6">
            {/* Moderation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Listings', value: stats.total, color: 'primary', icon: 'inventory_2' },
                    { label: 'Active Items', value: stats.active, color: 'green-500', icon: 'shopping_bag' },
                    { label: 'Under Review', value: stats.pending, color: 'amber-500', icon: 'farsight_digital' },
                    { label: 'Banned Items', value: stats.banned, color: 'red-500', icon: 'block' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <div className="flex items-center gap-4">
                            <div className={`size-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                                <h4 className="text-xl font-black">{stat.value || 0}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Catalog Filters */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-wrap items-center justify-between gap-4">
                <form onSubmit={handleSearch} className="relative w-full md:w-96 group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors">search</span>
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c]"
                        placeholder="Inspect Marketplace Inventory..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">category</span>
                        Category
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Price Range
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-primary/5 transition-colors">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Status
                    </button>
                </div>
            </div>

            {/* Product Directory Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                            <th className="px-6 py-4">Registry Item</th>
                            <th className="px-6 py-4">Merchant</th>
                            <th className="px-6 py-4">Valuation</th>
                            <th className="px-6 py-4">Policy Status</th>
                            <th className="px-6 py-4 text-center">Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                        {initialProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-primary/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="size-16 rounded-lg bg-gray-100 dark:bg-[#212b30] flex-shrink-0 relative overflow-hidden group/img">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt="" className="size-full object-cover group-hover/img:scale-110 transition-transform" />
                                            ) : (
                                                <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                                                    <span className="material-symbols-outlined text-2xl">image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#111618] dark:text-gray-200 group-hover:text-primary transition-colors max-w-[200px] truncate tracking-tight">{product.title}</p>
                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest mt-0.5">{product.category || 'General'}</p>
                                            <Link
                                                href={`/marketplace/${product.id}`}
                                                target="_blank"
                                                className="text-[9px] text-primary font-black uppercase mt-1.5 flex items-center gap-1 hover:underline tracking-widest"
                                            >
                                                View Live Pulse
                                                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-[#111618] dark:text-gray-200">{product.seller?.email?.split('@')[0] || 'Unknown'}</p>
                                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Verified Seller</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-primary tracking-tighter">GH₵ {parseFloat(product.price || 0).toFixed(2)}</p>
                                    <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest">Market Value</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase w-fit ${product.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                                        product.status === 'Banned' ? 'bg-red-500/10 text-red-500' :
                                            'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-transparent hover:border-primary/20">
                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                        </button>

                                        {product.status !== 'Banned' ? (
                                            <button
                                                onClick={() => updateStatus(product.id, 'Banned')}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                title="Flag for Deletion"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">flag</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(product.id, 'Active')}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                                                title="Restore Policy"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">restore</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => deleteProduct(product.id)}
                                            disabled={loading}
                                            className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20"
                                            title="Purge Record"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Placeholder */}
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Showing <span className="text-[#111618] dark:text-white">1-{initialProducts.length}</span> of <span className="text-[#111618] dark:text-white">{stats.total}</span></p>
                <div className="flex gap-2">
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
