'use client';
import { useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function ProductModerationClient({ initialProducts, stats = {} }) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [inspectProduct, setInspectProduct] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, type: '', data: null });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        if (search) params.set('q', search);
        else params.delete('q');
        router.push(`/dashboard/admin/products?${params.toString()}`);
    };

    const applyFilter = (key, value) => {
        const params = new URLSearchParams(window.location.search);
        if (value) params.set(key, value);
        else params.delete(key);
        router.push(`/dashboard/admin/products?${params.toString()}`);
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const updateStatus = async (productId, newStatus) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({ status: newStatus })
                .eq('id', productId);

            if (error) throw error;
            showToast(`Product ${newStatus.toLowerCase()} successfully!`);
            router.refresh();
        } catch (err) {
            console.error('Update failed:', err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    const deleteProduct = async (productId) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
            showToast('Product record purged successfully!');
            router.refresh();
        } catch (err) {
            console.error('Delete failed:', err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    // Simplified status styles logic to avoid broken references
    const statusStyles = {
        Active: 'bg-green-500/10 text-green-500',
        Banned: 'bg-red-500/10 text-red-500',
        Pending: 'bg-amber-500/10 text-amber-500',
        Default: 'bg-blue-500/10 text-blue-500'
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
                    <select
                        onChange={(e) => applyFilter('category', e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] bg-transparent hover:bg-primary/5 transition-colors outline-none cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fashion">Fashion</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Books">Books</option>
                        <option value="Services">Services</option>
                    </select>

                    <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
                        <input
                            type="number"
                            placeholder="Min"
                            className="w-16 bg-transparent text-[10px] font-black uppercase outline-none"
                            onBlur={(e) => applyFilter('minPrice', e.target.value)}
                        />
                        <span className="text-[#4b636c]">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-16 bg-transparent text-[10px] font-black uppercase outline-none"
                            onBlur={(e) => applyFilter('maxPrice', e.target.value)}
                        />
                    </div>

                    <select
                        onChange={(e) => applyFilter('status', e.target.value)}
                        className="px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] bg-transparent hover:bg-primary/5 transition-colors outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Banned">Banned</option>
                    </select>
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
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    fill
                                                    className="object-cover group-hover/img:scale-110 transition-transform"
                                                    sizes="64px"
                                                />
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
                                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Registry Merchant</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-primary tracking-tighter">GH₵ {parseFloat(product.price || 0).toFixed(2)}</p>
                                    <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest">Market Value</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase w-fit ${statusStyles[product.status] || statusStyles.Default}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setInspectProduct(product)}
                                            className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-transparent hover:border-primary/20 disabled:opacity-50"
                                            disabled={loading}
                                            title="Inspect Protocol"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                                        </button>

                                        {product.status !== 'Banned' ? (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'status', data: { id: product.id, status: 'Banned' } })}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                title="Flag for Deletion"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {loading ? 'sync' : 'flag'}
                                                </span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'status', data: { id: product.id, status: 'Active' } })}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                                title="Restore Policy"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {loading ? 'sync' : 'restore'}
                                                </span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setConfirmModal({ open: true, type: 'delete', data: { id: product.id } })}
                                            disabled={loading}
                                            className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20 disabled:opacity-50"
                                            title="Purge Record"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {loading ? 'sync' : 'delete'}
                                            </span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Protocol Inspection Modal */}
            {inspectProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/80 backdrop-blur-sm" onClick={() => setInspectProduct(null)}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-2xl rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter">Inventory Inspection</h2>
                                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-[0.2em] mt-1">Registry ID: {inspectProduct.id.slice(0, 8)}</p>
                            </div>
                            <button onClick={() => setInspectProduct(null)} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex gap-6">
                                <div className="size-40 rounded-2xl bg-gray-100 dark:bg-[#212b30] overflow-hidden relative border border-[#dce3e5] dark:border-[#2d3b41]">
                                    {inspectProduct.image_url ? (
                                        <Image src={inspectProduct.image_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-[#4b636c]/20">
                                            <span className="material-symbols-outlined text-4xl">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <h3 className="text-lg font-black tracking-tight">{inspectProduct.title}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusStyles[inspectProduct.status]}`}>
                                            {inspectProduct.status}
                                        </span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            GH₵ {parseFloat(inspectProduct.price || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#4b636c] leading-relaxed line-clamp-4">
                                        {inspectProduct.description || 'No detailed description provided in registry.'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Merchant Identity</p>
                                    <p className="text-xs font-black">{inspectProduct.seller?.email || 'Unknown Protocol'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Asset Category</p>
                                    <p className="text-xs font-black uppercase tracking-tighter">{inspectProduct.category || 'Standard'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-background-light dark:bg-[#212b30]/50 flex items-center justify-between gap-4">
                            <button
                                onClick={() => {
                                    window.open(`/marketplace/${inspectProduct.id}`, '_blank');
                                    setInspectProduct(null);
                                }}
                                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                                View Live Pulse
                            </button>

                            <div className="flex items-center gap-3">
                                {inspectProduct.status === 'Banned' ? (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({ open: true, type: 'status', data: { id: inspectProduct.id, status: 'Active' } });
                                            setInspectProduct(null);
                                        }}
                                        disabled={loading}
                                        className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
                                    >
                                        Restore Protocol
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({ open: true, type: 'status', data: { id: inspectProduct.id, status: 'Banned' } });
                                            setInspectProduct(null);
                                        }}
                                        disabled={loading}
                                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Restrict Access
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Confirmation Protocol */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md" onClick={() => !loading && setConfirmModal({ open: false, type: '', data: null })}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 text-center space-y-4">
                            <div className={`mx-auto size-16 rounded-2xl flex items-center justify-center ${confirmModal.type === 'delete' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {confirmModal.type === 'delete' ? 'warning' : 'info'}
                                </span>
                            </div>
                            <h3 className="text-xl font-black tracking-tighter">
                                {confirmModal.type === 'delete' ? 'Authorize Record Purge?' : 'Confirm Registry Update?'}
                            </h3>
                            <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest leading-relaxed">
                                {confirmModal.type === 'delete'
                                    ? 'This action will permanently remove this asset from the registry. This protocol cannot be reversed.'
                                    : `Are you sure you want to transition this asset to ${confirmModal.data.status} status?`}
                            </p>
                        </div>
                        <div className="p-6 bg-background-light dark:bg-[#212b30]/50 flex items-center gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, type: '', data: null })}
                                disabled={loading}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-white dark:hover:bg-[#182125] rounded-xl transition-colors disabled:opacity-50"
                            >
                                Abort
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmModal.type === 'delete') deleteProduct(confirmModal.data.id);
                                    else updateStatus(confirmModal.data.id, confirmModal.data.status);
                                }}
                                disabled={loading}
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 ${confirmModal.type === 'delete' ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'
                                    }`}
                            >
                                {loading ? 'Processing...' : 'Authorize'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl`}>
                        <span className="material-symbols-outlined text-sm">
                            {toast.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
