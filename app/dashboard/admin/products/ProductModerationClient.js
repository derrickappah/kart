'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
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
    
    // UI states for sorting, pagination, and selection
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedProducts, setSelectedProducts] = useState([]);
    
    const router = useRouter();
    const supabase = createClient();

    // Reset pagination and selection whenever products list changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedProducts([]);
    }, [initialProducts]);

    // Read min/max price from URL if present to populate states
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setSearch(params.get('q') || '');
        }
    }, [initialProducts]);

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

    const resetFilters = () => {
        setSearch('');
        router.push('/dashboard/admin/products');
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

    // Bulk actions
    const updateBulkStatus = async (newStatus) => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({ status: newStatus })
                .in('id', selectedProducts);

            if (error) throw error;
            showToast(`Successfully updated ${selectedProducts.length} listings to ${newStatus.toLowerCase()}!`);
            setSelectedProducts([]);
            router.refresh();
        } catch (err) {
            console.error('Bulk update failed:', err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    const deleteBulkProducts = async () => {
        if (selectedProducts.length === 0) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .in('id', selectedProducts);

            if (error) throw error;
            showToast(`Successfully purged ${selectedProducts.length} listings from the registry!`);
            setSelectedProducts([]);
            router.refresh();
        } catch (err) {
            console.error('Bulk delete failed:', err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, type: '', data: null });
        }
    };

    // Sorting logic
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedProducts = [...initialProducts].sort((a, b) => {
        let aVal = '';
        let bVal = '';

        if (sortField === 'title') {
            aVal = a.title || '';
            bVal = b.title || '';
        } else if (sortField === 'seller') {
            aVal = a.seller?.email || '';
            bVal = b.seller?.email || '';
        } else if (sortField === 'price') {
            aVal = parseFloat(a.price || 0);
            bVal = parseFloat(b.price || 0);
        } else if (sortField === 'status') {
            aVal = a.status || '';
            bVal = b.status || '';
        } else {
            // Default sorting by created_at (fallback newer first)
            aVal = new Date(a.created_at || 0).getTime();
            bVal = new Date(b.created_at || 0).getTime();
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === 'string') {
            return sortDirection === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
        } else {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
    });

    // Pagination logic
    const totalItems = sortedProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedProducts = sortedProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Dynamic parameters presence check for "Reset Filters"
    let hasActiveFilters = false;
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        hasActiveFilters = params.get('q') || params.get('category') || params.get('status') || params.get('minPrice') || params.get('maxPrice');
    }

    const statusStyles = {
        Active: 'bg-green-500/10 text-green-500 border border-green-500/20',
        Banned: 'bg-red-500/10 text-red-500 border border-red-500/20',
        Pending: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        Default: 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
    };

    // Header Sort Renderer Helper
    const SortHeader = ({ field, label }) => {
        const isActive = sortField === field;
        return (
            <th 
                onClick={() => handleSort(field)}
                className="px-6 py-4 cursor-pointer hover:bg-primary/[0.04] transition-colors select-none text-[10px] font-black uppercase tracking-widest text-[#4b636c]"
            >
                <div className="flex items-center gap-1.5 justify-start">
                    <span>{label}</span>
                    <span className={`transition-opacity duration-200 ${isActive ? 'opacity-100 text-primary' : 'opacity-30'}`}>
                        <DynamicLucideIcon 
                            name={isActive && sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'} 
                            size={12}
                        />
                    </span>
                </div>
            </th>
        );
    };

    const statsConfig = [
        { 
            label: 'Total Listings', 
            value: stats.total, 
            icon: 'inventory_2', 
            iconClass: 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-primary' 
        },
        { 
            label: 'Active Items', 
            value: stats.active, 
            icon: 'shopping_bag', 
            iconClass: 'bg-green-500/10 text-green-500 border border-green-500/20 dark:bg-green-500/20 dark:text-green-400' 
        },
        { 
            label: 'Under Review', 
            value: stats.pending, 
            icon: 'pending', 
            iconClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' 
        },
        { 
            label: 'Banned Items', 
            value: stats.banned, 
            icon: 'block', 
            iconClass: 'bg-red-500/10 text-red-500 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400' 
        },
    ];

    return (
        <div className="space-y-6">
            {/* Moderation Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsConfig.map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.iconClass}`}>
                                <DynamicLucideIcon name={stat.icon} size={20} />
                            </div>
                            <div>
                                <p className="text-[#4b636c] dark:text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                                <h4 className="text-lg sm:text-xl font-black">{stat.value || 0}</h4>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Catalog Filters */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <form onSubmit={handleSearch} className="relative w-full lg:w-96 group">
                    <DynamicLucideIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b636c] group-focus-within:text-primary transition-colors" />
                    <input
                        className="w-full bg-background-light dark:bg-[#212b30] border-none rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-[#4b636c] outline-none"
                        placeholder="Inspect Marketplace Inventory..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <select
                        onChange={(e) => applyFilter('category', e.target.value)}
                        className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] bg-transparent hover:bg-primary/5 transition-colors outline-none cursor-pointer"
                    >
                        <option value="">All Categories</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Fashion">Fashion</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Books">Books</option>
                        <option value="Services">Services</option>
                    </select>

                    <div className="flex-1 lg:flex-initial flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] bg-transparent">
                        <input
                            type="number"
                            placeholder="Min"
                            className="w-16 bg-transparent text-[10px] font-black uppercase outline-none text-center"
                            onBlur={(e) => applyFilter('minPrice', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilter('minPrice', e.target.value)}
                        />
                        <span className="text-[#4b636c]">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            className="w-16 bg-transparent text-[10px] font-black uppercase outline-none text-center"
                            onBlur={(e) => applyFilter('maxPrice', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilter('maxPrice', e.target.value)}
                        />
                    </div>

                    <select
                        onChange={(e) => applyFilter('status', e.target.value)}
                        className="flex-1 lg:flex-initial px-4 py-2.5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-widest text-[#4b636c] bg-transparent hover:bg-primary/5 transition-colors outline-none cursor-pointer"
                    >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Banned">Banned</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-4 py-2.5 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                        >
                            <DynamicLucideIcon name="close" size={12} />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Product Directory Table */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[850px] md:min-w-0">
                    <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                            <th className="px-6 py-4 w-12 text-center select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-[#dce3e5] dark:border-[#2d3b41] text-primary focus:ring-primary/40 size-4 cursor-pointer"
                                    checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.includes(p.id))}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            const pageIds = paginatedProducts.map(p => p.id);
                                            setSelectedProducts(prev => Array.from(new Set([...prev, ...pageIds])));
                                        } else {
                                            const pageIds = paginatedProducts.map(p => p.id);
                                            setSelectedProducts(prev => prev.filter(id => !pageIds.includes(id)));
                                        }
                                    }}
                                />
                            </th>
                            <SortHeader field="title" label="Registry Item" />
                            <SortHeader field="seller" label="Merchant" />
                            <SortHeader field="price" label="Valuation" />
                            <SortHeader field="status" label="Policy Status" />
                            <th className="px-6 py-4 text-center">Protocol</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                        {paginatedProducts.map((product) => (
                            <tr key={product.id} className={`hover:bg-primary/[0.02] transition-colors group ${selectedProducts.includes(product.id) ? 'bg-primary/[0.03]' : ''}`}>
                                <td className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-[#dce3e5] dark:border-[#2d3b41] text-primary focus:ring-primary/40 size-4 cursor-pointer"
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedProducts(prev => [...prev, product.id]);
                                            } else {
                                                setSelectedProducts(prev => prev.filter(id => id !== product.id));
                                            }
                                        }}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="size-14 rounded-lg bg-gray-100 dark:bg-[#212b30] flex-shrink-0 relative overflow-hidden group/img border border-[#dce3e5] dark:border-[#2d3b41]">
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    fill
                                                    className="object-cover group-hover/img:scale-110 transition-transform"
                                                    sizes="56px"
                                                />
                                            ) : (
                                                <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                                                    <DynamicLucideIcon name="image" className="text-xl" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#111618] dark:text-gray-200 group-hover:text-primary transition-colors max-w-[220px] truncate tracking-tight">{product.title}</p>
                                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest mt-0.5">{product.category || 'General'}</p>
                                            <Link
                                                href={`/marketplace/${product.id}`}
                                                target="_blank"
                                                className="text-[9px] text-primary font-black uppercase mt-1 flex items-center gap-1 hover:underline tracking-widest"
                                            >
                                                View Live Pulse
                                                <DynamicLucideIcon name="open_in_new" size={10} />
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-[#111618] dark:text-gray-200 truncate max-w-[150px]">{product.seller?.email?.split('@')[0] || 'Unknown'}</p>
                                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Registry Merchant</p>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-primary tracking-tighter">GH₵ {parseFloat(product.price || 0).toFixed(2)}</p>
                                    <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest">Market Value</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusStyles[product.status] || statusStyles.Default}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setInspectProduct(product)}
                                            className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20 disabled:opacity-50"
                                            disabled={loading}
                                            title="Inspect Protocol"
                                        >
                                            <DynamicLucideIcon name="visibility" size={16} />
                                        </button>

                                        {product.status !== 'Banned' ? (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'status', data: { id: product.id, status: 'Banned' } })}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50"
                                                title="Restrict Listing"
                                            >
                                                <DynamicLucideIcon name={loading ? 'sync' : 'block'} size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmModal({ open: true, type: 'status', data: { id: product.id, status: 'Active' } })}
                                                disabled={loading}
                                                className="size-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 border border-green-500/20 transition-colors disabled:opacity-50"
                                                title="Restore Listing"
                                            >
                                                <DynamicLucideIcon name={loading ? 'sync' : 'undo'} size={16} />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setConfirmModal({ open: true, type: 'delete', data: { id: product.id } })}
                                            disabled={loading}
                                            className="size-8 rounded-lg bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-red-500 transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-red-500/20 disabled:opacity-50"
                                            title="Purge Record"
                                        >
                                            <DynamicLucideIcon name={loading ? 'sync' : 'delete'} size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {initialProducts.length === 0 && (
                            <tr className="hover:bg-transparent">
                                <td colSpan="6" className="py-16 text-center text-[#4b636c] dark:text-gray-500">
                                    <div className="max-w-md mx-auto space-y-4 px-4">
                                        <div className="mx-auto size-16 rounded-2xl bg-gray-100 dark:bg-[#212b30] flex items-center justify-center text-[#4b636c]/50">
                                            <DynamicLucideIcon name="search_off" size={32} />
                                        </div>
                                        <h4 className="text-base font-black tracking-tight text-gray-900 dark:text-white">No Matching Products Found</h4>
                                        <p className="text-xs text-[#4b636c] leading-relaxed">
                                            We couldn't find any products in the platform registry matching your active filters. Try refining your search queries or category filters.
                                        </p>
                                        {hasActiveFilters && (
                                            <button
                                                onClick={resetFilters}
                                                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 inline-flex items-center gap-2"
                                            >
                                                <DynamicLucideIcon name="close" size={12} />
                                                Clear All Filters
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#dce3e5] dark:border-[#2d3b41] pb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                        <span>Items per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-transparent border border-[#dce3e5] dark:border-[#2d3b41] rounded-lg px-2 py-1 outline-none text-xs cursor-pointer text-gray-800 dark:text-gray-200"
                        >
                            {[5, 10, 25, 50].map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <span className="ml-4">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="size-8 rounded-lg border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="First Page"
                        >
                            <DynamicLucideIcon name="arrow_back" size={14} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="size-8 rounded-lg border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Previous Page"
                        >
                            <DynamicLucideIcon name="chevron_left" size={14} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                            .map((page, idx, arr) => {
                                const showDots = idx > 0 && page - arr[idx - 1] > 1;
                                return (
                                    <div key={page} className="flex items-center">
                                        {showDots && <span className="px-1.5 text-[#4b636c] text-[10px] font-black">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`size-8 rounded-lg flex items-center justify-center text-xs font-black uppercase transition-all ${
                                                currentPage === page
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                    : 'border border-[#dce3e5] dark:border-[#2d3b41] text-[#4b636c] hover:bg-primary/5'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    </div>
                                );
                            })}
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="size-8 rounded-lg border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Next Page"
                        >
                            <DynamicLucideIcon name="chevron_right" size={14} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="size-8 rounded-lg border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:bg-primary/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Last Page"
                        >
                            <DynamicLucideIcon name="arrow_forward" size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>

            {/* Floating Bulk Action Bar */}
            {selectedProducts.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#182125] border border-primary/20 dark:border-[#2d3b41] shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-5 duration-300">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#4b636c] dark:text-gray-300">
                        {selectedProducts.length} {selectedProducts.length === 1 ? 'item' : 'items'} selected
                    </span>
                    <div className="h-6 w-px bg-[#dce3e5] dark:bg-[#2d3b41]"></div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setConfirmModal({ open: true, type: 'bulk-status', data: { status: 'Active' } })}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                        >
                            <DynamicLucideIcon name="check" size={12} />
                            Activate
                        </button>
                        <button
                            onClick={() => setConfirmModal({ open: true, type: 'bulk-status', data: { status: 'Banned' } })}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                        >
                            <DynamicLucideIcon name="block" size={12} />
                            Ban
                        </button>
                        <button
                            onClick={() => setConfirmModal({ open: true, type: 'bulk-delete', data: null })}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-red-500/10"
                        >
                            <DynamicLucideIcon name="delete" size={12} />
                            Purge
                        </button>
                        <button
                            onClick={() => setSelectedProducts([])}
                            className="px-3 py-2 text-[#4b636c] dark:text-gray-400 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Protocol Inspection Modal */}
            {inspectProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/80 backdrop-blur-sm" onClick={() => setInspectProduct(null)}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-2xl rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        <div className="p-6 sm:p-8 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter">Inventory Inspection</h2>
                                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-[0.2em] mt-1">Registry ID: {inspectProduct.id}</p>
                            </div>
                            <button onClick={() => setInspectProduct(null)} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center transition-colors">
                                <DynamicLucideIcon name="close" size={20} />
                            </button>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="size-40 rounded-2xl bg-gray-100 dark:bg-[#212b30] overflow-hidden relative border border-[#dce3e5] dark:border-[#2d3b41] shrink-0 mx-auto sm:mx-0">
                                    {inspectProduct.image_url ? (
                                        <Image src={inspectProduct.image_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-[#4b636c]/20">
                                            <DynamicLucideIcon name="image" size={40} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3 text-center sm:text-left">
                                    <h3 className="text-lg font-black tracking-tight">{inspectProduct.title}</h3>
                                    <div className="flex items-center justify-center sm:justify-start gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${statusStyles[inspectProduct.status]}`}>
                                            {inspectProduct.status}
                                        </span>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                            GH₵ {parseFloat(inspectProduct.price || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#4b636c] leading-relaxed">
                                        {inspectProduct.description || 'No detailed description provided in registry.'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Merchant Identity</p>
                                    <p className="text-xs font-black truncate">{inspectProduct.seller?.email || 'Unknown Protocol'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Asset Category</p>
                                    <p className="text-xs font-black uppercase tracking-tighter">{inspectProduct.category || 'Standard'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 bg-background-light dark:bg-[#212b30]/50 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0 border-t border-[#dce3e5] dark:border-[#2d3b41]">
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
                            <div className={`mx-auto size-16 rounded-2xl flex items-center justify-center ${confirmModal.type.includes('delete') ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                                <DynamicLucideIcon name={confirmModal.type.includes('delete') ? 'warning' : 'info'} size={32} />
                            </div>
                            <h3 className="text-xl font-black tracking-tighter">
                                {confirmModal.type.includes('delete') ? 'Authorize Record Purge?' : 'Confirm Registry Update?'}
                            </h3>
                            <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest leading-relaxed">
                                {confirmModal.type === 'delete'
                                    ? 'This action will permanently remove this asset from the registry. This protocol cannot be reversed.'
                                    : confirmModal.type === 'bulk-delete'
                                    ? `This action will permanently remove all ${selectedProducts.length} selected assets from the registry. This protocol cannot be reversed.`
                                    : confirmModal.type === 'bulk-status'
                                    ? `Are you sure you want to transition all ${selectedProducts.length} selected assets to ${confirmModal.data.status} status?`
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
                                    else if (confirmModal.type === 'status') updateStatus(confirmModal.data.id, confirmModal.data.status);
                                    else if (confirmModal.type === 'bulk-status') updateBulkStatus(confirmModal.data.status);
                                    else if (confirmModal.type === 'bulk-delete') deleteBulkProducts();
                                }}
                                disabled={loading}
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 ${confirmModal.type.includes('delete') ? 'bg-red-500 shadow-red-500/20' : 'bg-primary shadow-primary/20'
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
                        <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : 'error'} size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
