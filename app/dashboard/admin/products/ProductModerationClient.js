'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { formatPrice } from '@/utils/formatters';

const CATEGORIES = [
    'Textbooks',
    'Electronics',
    'Dorm Furniture',
    'Clothing',
    'School Supplies',
    'Tickets & Events',
    'Services & Tutoring',
    'Beauty & Grooming',
    'Sports & Fitness',
    'Kitchenware',
    'Musical Instruments',
    'Games & Consoles',
    'Health & Wellness',
    'Arts & Crafts',
    'Home Appliances'
];

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export default function ProductModerationClient({
    initialProducts = [],
    stats = {},
    totalFiltered = 0,
    currentPage = 1,
    pageSize = 20,
    currentFilters = {}
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Local filter states
    const [searchQuery, setSearchQuery] = useState(currentFilters.q || '');
    const [selectedCategory, setSelectedCategory] = useState(currentFilters.category || '');
    const [selectedStatus, setSelectedStatus] = useState(currentFilters.status || '');
    const [minPrice, setMinPrice] = useState(currentFilters.minPrice || '');
    const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice || '');
    const [sortBy, setSortBy] = useState(currentFilters.sort || 'newest');

    // UI View & Selection states
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [selectedIds, setSelectedIds] = useState([]);
    const [inspectProduct, setInspectProduct] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [confirmModal, setConfirmModal] = useState({ open: false, action: '', item: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);

    // Sync input when URL param changes
    useEffect(() => {
        setSearchQuery(currentFilters.q || '');
        setSelectedCategory(currentFilters.category || '');
        setSelectedStatus(currentFilters.status || '');
        setMinPrice(currentFilters.minPrice || '');
        setMaxPrice(currentFilters.maxPrice || '');
        setSortBy(currentFilters.sort || 'newest');
        setSelectedIds([]);
    }, [currentFilters]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    // Navigation and query updates
    const updateUrlParams = (newParams) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(newParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                params.set(key, val);
            } else {
                params.delete(key);
            }
        });

        // Reset page to 1 when filters change (unless page is explicitly provided)
        if (!('page' in newParams)) {
            params.delete('page');
        }

        startTransition(() => {
            router.push(`/dashboard/admin/products?${params.toString()}`);
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        updateUrlParams({ q: searchQuery });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        updateUrlParams({ q: '' });
    };

    const handleStatusTab = (status) => {
        setSelectedStatus(status);
        updateUrlParams({ status });
    };

    const handleCategoryChange = (e) => {
        const cat = e.target.value;
        setSelectedCategory(cat);
        updateUrlParams({ category: cat });
    };

    const handleSortChange = (e) => {
        const sort = e.target.value;
        setSortBy(sort);
        updateUrlParams({ sort });
    };

    const handlePriceApply = () => {
        updateUrlParams({ minPrice, maxPrice });
        setIsPriceFilterOpen(false);
    };

    const handlePriceReset = () => {
        setMinPrice('');
        setMaxPrice('');
        updateUrlParams({ minPrice: '', maxPrice: '' });
        setIsPriceFilterOpen(false);
    };

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedStatus('');
        setMinPrice('');
        setMaxPrice('');
        setSortBy('newest');
        startTransition(() => {
            router.push('/dashboard/admin/products');
        });
    };

    const hasActiveFilters = Boolean(
        currentFilters.q ||
        currentFilters.category ||
        currentFilters.status ||
        currentFilters.minPrice ||
        currentFilters.maxPrice ||
        (currentFilters.sort && currentFilters.sort !== 'newest')
    );

    // Batch and Selection helpers
    const toggleSelectAll = () => {
        if (selectedIds.length === initialProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(initialProducts.map((p) => p.id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Actions (Single & Batch)
    const handleStatusUpdate = async (ids, newStatus) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/products/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: ids, status: newStatus })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update product status');

            showToast(
                ids.length === 1
                    ? `Listing marked as ${newStatus}`
                    : `${ids.length} listings marked as ${newStatus}`
            );
            setSelectedIds([]);
            setConfirmModal({ open: false, action: '', item: null });
            if (inspectProduct && ids.includes(inspectProduct.id)) {
                setInspectProduct((prev) => (prev ? { ...prev, status: newStatus } : null));
            }
            router.refresh();
        } catch (err) {
            console.error('Update status error:', err);
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (ids) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/products/update-status', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds: ids })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete listing');

            showToast(
                ids.length === 1
                    ? 'Listing permanently deleted'
                    : `${ids.length} listings permanently deleted`
            );
            setSelectedIds([]);
            setConfirmModal({ open: false, action: '', item: null });
            if (inspectProduct && ids.includes(inspectProduct.id)) {
                setInspectProduct(null);
            }
            router.refresh();
        } catch (err) {
            console.error('Delete listing error:', err);
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Status styling helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Active':
                return {
                    label: 'Active',
                    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                    text: 'text-emerald-700 dark:text-emerald-400',
                    border: 'border-emerald-200 dark:border-emerald-800/50',
                    dot: 'bg-emerald-500'
                };
            case 'Pending':
                return {
                    label: 'Pending Review',
                    bg: 'bg-amber-50 dark:bg-amber-950/30',
                    text: 'text-amber-700 dark:text-amber-400',
                    border: 'border-amber-200 dark:border-amber-800/50',
                    dot: 'bg-amber-500 animate-pulse'
                };
            case 'Banned':
                return {
                    label: 'Banned',
                    bg: 'bg-rose-50 dark:bg-rose-950/30',
                    text: 'text-rose-700 dark:text-rose-400',
                    border: 'border-rose-200 dark:border-rose-800/50',
                    dot: 'bg-rose-500'
                };
            case 'Sold':
                return {
                    label: 'Sold',
                    bg: 'bg-gray-100 dark:bg-gray-800',
                    text: 'text-gray-600 dark:text-gray-300',
                    border: 'border-gray-200 dark:border-gray-700',
                    dot: 'bg-gray-400'
                };
            default:
                return {
                    label: status || 'Unknown',
                    bg: 'bg-blue-50 dark:bg-blue-950/30',
                    text: 'text-blue-700 dark:text-blue-400',
                    border: 'border-blue-200 dark:border-blue-800/50',
                    dot: 'bg-blue-500'
                };
        }
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const startRange = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalFiltered);

    // Multi-image resolver helper for inspected product
    const inspectImages = inspectProduct
        ? Array.isArray(inspectProduct.images) && inspectProduct.images.length > 0
            ? inspectProduct.images
            : inspectProduct.image_url
            ? [inspectProduct.image_url]
            : []
        : [];

    return (
        <div className="space-y-6">
            {/* Header with Title and Quick Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        Products & Moderation
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {stats.total || 0} Total
                        </span>
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Review submissions, regulate campus listings, and manage marketplace inventory.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.refresh()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#182125] hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all active:scale-95"
                        title="Refresh listing data"
                    >
                        <DynamicLucideIcon name="refresh" className={`text-base ${isPending ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>

                    <Link
                        href="/marketplace"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark shadow-sm shadow-primary/25 transition-all active:scale-95"
                    >
                        <span>Marketplace</span>
                        <DynamicLucideIcon name="open_in_new" className="text-xs" />
                    </Link>
                </div>
            </div>

            {/* KPI Metrics Row - Clickable Cards to filter by status */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                    {
                        label: 'All Listings',
                        value: stats.total,
                        statusKey: '',
                        icon: 'package_2',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                        activeBorder: 'border-primary'
                    },
                    {
                        label: 'Pending Review',
                        value: stats.pending,
                        statusKey: 'Pending',
                        icon: 'pending_actions',
                        color: 'text-amber-600 dark:text-amber-400',
                        bg: 'bg-amber-500/10',
                        activeBorder: 'border-amber-500',
                        badge: stats.pending > 0 ? 'Needs Action' : null
                    },
                    {
                        label: 'Active Listings',
                        value: stats.active,
                        statusKey: 'Active',
                        icon: 'shopping_bag',
                        color: 'text-emerald-600 dark:text-emerald-400',
                        bg: 'bg-emerald-500/10',
                        activeBorder: 'border-emerald-500'
                    },
                    {
                        label: 'Banned / Restricted',
                        value: stats.banned,
                        statusKey: 'Banned',
                        icon: 'block',
                        color: 'text-rose-600 dark:text-rose-400',
                        bg: 'bg-rose-500/10',
                        activeBorder: 'border-rose-500'
                    },
                    {
                        label: 'Sold Items',
                        value: stats.sold || 0,
                        statusKey: 'Sold',
                        icon: 'check_circle',
                        color: 'text-purple-600 dark:text-purple-400',
                        bg: 'bg-purple-500/10',
                        activeBorder: 'border-purple-500'
                    }
                ].map((kpi, idx) => {
                    const isSelected = selectedStatus === kpi.statusKey;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleStatusTab(kpi.statusKey)}
                            className={`p-4 rounded-2xl text-left border transition-all relative overflow-hidden group ${
                                isSelected
                                    ? `bg-white dark:bg-[#1e282d] border-2 ${kpi.activeBorder} shadow-md`
                                    : 'bg-white/80 dark:bg-[#182125]/80 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                            }`}
                        >
                            {kpi.badge && (
                                <span className="absolute top-3 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                                    {kpi.badge}
                                </span>
                            )}
                            <div className="flex items-center gap-3">
                                <div className={`size-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0`}>
                                    <DynamicLucideIcon name={kpi.icon} className="text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                                        {kpi.label}
                                    </p>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
                                        {kpi.value || 0}
                                    </h3>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Quick Status Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { label: 'All Listings', key: '', count: stats.total },
                    { label: 'Pending Review', key: 'Pending', count: stats.pending, alert: stats.pending > 0 },
                    { label: 'Active', key: 'Active', count: stats.active },
                    { label: 'Banned', key: 'Banned', count: stats.banned },
                    { label: 'Sold', key: 'Sold', count: stats.sold || 0 }
                ].map((tab) => {
                    const isActive = selectedStatus === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleStatusTab(tab.key)}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                                    : 'bg-white dark:bg-[#182125] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span
                                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                    isActive
                                        ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900'
                                        : tab.alert
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}
                            >
                                {tab.count || 0}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Toolbar: Search, Filters, Sort, View Toggle */}
            <div className="bg-white/90 dark:bg-[#182125]/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 group">
                        <DynamicLucideIcon
                            name="search"
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-base"
                        />
                        <input
                            type="text"
                            placeholder="Search by title, description, or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#212b30] border border-gray-200 dark:border-gray-700/80 rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-[#182125] focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <DynamicLucideIcon name="close" className="text-sm" />
                            </button>
                        )}
                    </form>

                    {/* Filter Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Category Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={handleCategoryChange}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                            <DynamicLucideIcon
                                name="expand_more"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"
                            />
                        </div>

                        {/* Price Filter Button & Popover */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                                    minPrice || maxPrice
                                        ? 'border-primary/50 bg-primary/10 text-primary'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-gray-700 dark:text-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <DynamicLucideIcon name="monetization_on" className="text-sm" />
                                <span>
                                    {minPrice || maxPrice ? `GH₵ ${minPrice || 0} - ${maxPrice || '∞'}` : 'Price Range'}
                                </span>
                                <DynamicLucideIcon name="expand_more" className="text-xs" />
                            </button>

                            {isPriceFilterOpen && (
                                <div className="absolute top-full mt-2 right-0 z-30 w-72 bg-white dark:bg-[#1e282d] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">Price Range (GH₵)</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Min</span>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                className="w-full mt-1 px-3 py-1.5 bg-gray-50 dark:bg-[#28353b] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold"
                                            />
                                        </div>
                                        <span className="text-gray-400 self-end mb-2">—</span>
                                        <div className="flex-1">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold">Max</span>
                                            <input
                                                type="number"
                                                placeholder="Any"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                className="w-full mt-1 px-3 py-1.5 bg-gray-50 dark:bg-[#28353b] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <button
                                            type="button"
                                            onClick={handlePriceReset}
                                            className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePriceApply}
                                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark"
                                        >
                                            Apply Filter
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={handleSortChange}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                            </select>
                            <DynamicLucideIcon
                                name="sort"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"
                            />
                        </div>

                        {/* View Switcher: Table vs Grid */}
                        <div className="flex items-center p-1 bg-gray-100 dark:bg-[#212b30] rounded-xl border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'table'
                                        ? 'bg-white dark:bg-[#182125] text-primary shadow-xs'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                                title="Table View"
                            >
                                <DynamicLucideIcon name="view_headline" className="text-base" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-[#182125] text-primary shadow-xs'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                                title="Grid View"
                            >
                                <DynamicLucideIcon name="grid_view" className="text-base" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Summary & Reset Bar */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/80 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-gray-400 font-medium">Active filters:</span>
                            {currentFilters.q && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Keyword: &quot;{currentFilters.q}&quot;
                                    <button onClick={handleClearSearch} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                            {currentFilters.category && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Category: {currentFilters.category}
                                    <button onClick={() => updateUrlParams({ category: '' })} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                            {currentFilters.status && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Status: {currentFilters.status}
                                    <button onClick={() => updateUrlParams({ status: '' })} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                            {(currentFilters.minPrice || currentFilters.maxPrice) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Price: GH₵ {currentFilters.minPrice || 0} - {currentFilters.maxPrice || '∞'}
                                    <button onClick={handlePriceReset} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleClearAllFilters}
                            className="text-primary font-bold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Batch Actions Floating Toolbar */}
            {selectedIds.length > 0 && (
                <div className="sticky top-4 z-30 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">
                            {selectedIds.length}
                        </span>
                        <span className="text-xs font-bold">
                            {selectedIds.length === 1 ? '1 listing selected' : `${selectedIds.length} listings selected`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleStatusUpdate(selectedIds, 'Active')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="check" className="text-sm" />
                            <span>Approve All</span>
                        </button>
                        <button
                            onClick={() => handleStatusUpdate(selectedIds, 'Banned')}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="block" className="text-sm" />
                            <span>Ban All</span>
                        </button>
                        <button
                            onClick={() =>
                                setConfirmModal({
                                    open: true,
                                    action: 'batch_delete',
                                    item: { count: selectedIds.length, ids: selectedIds }
                                })
                            }
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="delete" className="text-sm" />
                            <span>Delete All</span>
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-gray-300 dark:text-gray-600 hover:text-white dark:hover:text-gray-900"
                        >
                            Deselect
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content: Table or Grid View */}
            {initialProducts.length === 0 ? (
                <div className="bg-white dark:bg-[#182125] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center space-y-4">
                    <div className="size-16 rounded-2xl bg-gray-100 dark:bg-[#212b30] flex items-center justify-center mx-auto text-gray-400">
                        <DynamicLucideIcon name="package_2" className="text-3xl" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No products found</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            No listings match your search criteria. Try modifying your search keywords or removing active filters.
                        </p>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearAllFilters}
                            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark shadow-sm transition-all"
                        >
                            Reset All Filters
                        </button>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white dark:bg-[#182125] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-50/75 dark:bg-[#212b30]/60 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                                    <th className="px-4 py-3.5 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={
                                                initialProducts.length > 0 &&
                                                selectedIds.length === initialProducts.length
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded text-primary focus:ring-primary cursor-pointer size-4"
                                        />
                                    </th>
                                    <th className="px-4 py-3.5">Product</th>
                                    <th className="px-4 py-3.5">Seller</th>
                                    <th className="px-4 py-3.5">Price</th>
                                    <th className="px-4 py-3.5">Status</th>
                                    <th className="px-4 py-3.5">Listed</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {initialProducts.map((product) => {
                                    const isSelected = selectedIds.includes(product.id);
                                    const statusBadge = getStatusBadge(product.status);
                                    const seller = product.seller || {};
                                    const sellerName = seller.display_name || seller.email?.split('@')[0] || 'Unknown Seller';
                                    const imagesCount = Array.isArray(product.images) ? product.images.length : (product.image_url ? 1 : 0);

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`group transition-colors ${
                                                isSelected
                                                    ? 'bg-primary/5 dark:bg-primary/10'
                                                    : 'hover:bg-gray-50/70 dark:hover:bg-[#212b30]/40'
                                            }`}
                                        >
                                            <td className="px-4 py-3.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectOne(product.id)}
                                                    className="rounded text-primary focus:ring-primary cursor-pointer size-4"
                                                />
                                            </td>

                                            {/* Product Info */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-14 rounded-xl bg-gray-100 dark:bg-[#212b30] shrink-0 relative overflow-hidden border border-gray-200/80 dark:border-gray-700/80">
                                                        {product.image_url ? (
                                                            <Image
                                                                src={product.image_url}
                                                                alt={product.title}
                                                                fill
                                                                sizes="56px"
                                                                className="object-cover group-hover:scale-105 transition-transform duration-200"
                                                            />
                                                        ) : (
                                                            <div className="size-full flex items-center justify-center text-gray-400">
                                                                <DynamicLucideIcon name="image" className="text-xl" />
                                                            </div>
                                                        )}
                                                        {imagesCount > 1 && (
                                                            <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] font-black px-1 rounded">
                                                                +{imagesCount - 1}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0 max-w-xs">
                                                        <button
                                                            onClick={() => {
                                                                setInspectProduct(product);
                                                                setActiveImageIndex(0);
                                                            }}
                                                            className="text-left font-bold text-xs text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate block"
                                                            title={product.title}
                                                        >
                                                            {product.title}
                                                        </button>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#212b30] text-gray-600 dark:text-gray-300">
                                                                {product.category || 'General'}
                                                            </span>
                                                            {product.condition && (
                                                                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-400">
                                                                    • {product.condition}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Seller Info */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                                                        {seller.avatar_url ? (
                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                            <img
                                                                src={seller.avatar_url}
                                                                alt=""
                                                                className="size-full object-cover"
                                                            />
                                                        ) : (
                                                            sellerName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            {seller.id ? (
                                                                <Link
                                                                    href={`/dashboard/admin/users/${seller.id}`}
                                                                    className="text-xs font-bold text-gray-900 dark:text-white hover:text-primary hover:underline truncate"
                                                                >
                                                                    {sellerName}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                                    {sellerName}
                                                                </span>
                                                            )}
                                                            {seller.is_verified && (
                                                                <DynamicLucideIcon
                                                                    name="verified"
                                                                    className="text-primary text-xs shrink-0"
                                                                    title="Verified Seller"
                                                                />
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                            {seller.campus || seller.email || 'Campus not set'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Price */}
                                            <td className="px-4 py-3.5">
                                                <span className="text-xs font-extrabold text-primary">
                                                    GH₵ {formatPrice(product.price || 0)}
                                                </span>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                                                >
                                                    <span className={`size-1.5 rounded-full ${statusBadge.dot}`} />
                                                    {statusBadge.label}
                                                </span>
                                            </td>

                                            {/* Listing Date */}
                                            <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                {timeAgo(product.created_at)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Quick Approve for Pending */}
                                                    {product.status === 'Pending' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate([product.id], 'Active')}
                                                            disabled={actionLoading}
                                                            className="size-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center transition-colors"
                                                            title="Approve Listing"
                                                        >
                                                            <DynamicLucideIcon name="check" className="text-sm" />
                                                        </button>
                                                    )}

                                                    {/* Quick Ban or Restore */}
                                                    {product.status !== 'Banned' ? (
                                                        <button
                                                            onClick={() =>
                                                                setConfirmModal({
                                                                    open: true,
                                                                    action: 'ban',
                                                                    item: product
                                                                })
                                                            }
                                                            disabled={actionLoading}
                                                            className="size-8 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 dark:bg-[#212b30] dark:hover:bg-rose-950/40 dark:text-gray-300 dark:hover:text-rose-400 flex items-center justify-center transition-colors"
                                                            title="Restrict / Ban Listing"
                                                        >
                                                            <DynamicLucideIcon name="block" className="text-sm" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleStatusUpdate([product.id], 'Active')}
                                                            disabled={actionLoading}
                                                            className="size-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 flex items-center justify-center transition-colors"
                                                            title="Restore Listing"
                                                        >
                                                            <DynamicLucideIcon name="refresh" className="text-sm" />
                                                        </button>
                                                    )}

                                                    {/* Quick Inspect Drawer */}
                                                    <button
                                                        onClick={() => {
                                                            setInspectProduct(product);
                                                            setActiveImageIndex(0);
                                                        }}
                                                        className="size-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-[#212b30] dark:hover:bg-gray-800 dark:text-gray-300 flex items-center justify-center transition-colors"
                                                        title="Inspect Details"
                                                    >
                                                        <DynamicLucideIcon name="visibility" className="text-sm" />
                                                    </button>

                                                    {/* Open live listing in marketplace */}
                                                    <Link
                                                        href={`/marketplace/${product.id}`}
                                                        target="_blank"
                                                        className="size-8 rounded-lg bg-gray-100 hover:bg-primary/10 text-gray-600 hover:text-primary dark:bg-[#212b30] dark:hover:bg-primary/10 dark:text-gray-300 dark:hover:text-primary flex items-center justify-center transition-colors"
                                                        title="View on Live Marketplace"
                                                    >
                                                        <DynamicLucideIcon name="open_in_new" className="text-sm" />
                                                    </Link>

                                                    {/* Delete Listing */}
                                                    <button
                                                        onClick={() =>
                                                            setConfirmModal({
                                                                open: true,
                                                                action: 'delete',
                                                                item: product
                                                            })
                                                        }
                                                        disabled={actionLoading}
                                                        className="size-8 rounded-lg bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 dark:bg-[#212b30] dark:hover:bg-rose-950/40 dark:text-gray-300 dark:hover:text-rose-400 flex items-center justify-center transition-colors"
                                                        title="Permanently Delete Listing"
                                                    >
                                                        <DynamicLucideIcon name="delete" className="text-sm" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Visual Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {initialProducts.map((product) => {
                        const isSelected = selectedIds.includes(product.id);
                        const statusBadge = getStatusBadge(product.status);
                        const seller = product.seller || {};
                        const sellerName = seller.display_name || seller.email?.split('@')[0] || 'Unknown Seller';
                        const imagesCount = Array.isArray(product.images) ? product.images.length : (product.image_url ? 1 : 0);

                        return (
                            <div
                                key={product.id}
                                className={`bg-white dark:bg-[#182125] rounded-2xl border transition-all overflow-hidden flex flex-col group ${
                                    isSelected
                                        ? 'border-2 border-primary shadow-md'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                                }`}
                            >
                                {/* Card Thumbnail Area */}
                                <div className="relative aspect-4/3 bg-gray-100 dark:bg-[#212b30] overflow-hidden">
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.title}
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-gray-400">
                                            <DynamicLucideIcon name="image" className="text-3xl" />
                                        </div>
                                    )}

                                    {/* Select Checkbox on Card */}
                                    <div className="absolute top-2.5 left-2.5 z-10">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectOne(product.id)}
                                            className="rounded text-primary focus:ring-primary cursor-pointer size-4 shadow-sm"
                                        />
                                    </div>

                                    {/* Status Badge on Card */}
                                    <div className="absolute top-2.5 right-2.5 z-10">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} backdrop-blur-xs`}
                                        >
                                            <span className={`size-1.5 rounded-full ${statusBadge.dot}`} />
                                            {statusBadge.label}
                                        </span>
                                    </div>

                                    {/* Image Count Indicator */}
                                    {imagesCount > 1 && (
                                        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                            <DynamicLucideIcon name="image" className="text-xs" />
                                            <span>{imagesCount}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                {product.category || 'General'}
                                            </span>
                                            <span className="text-xs font-black text-primary">
                                                GH₵ {formatPrice(product.price || 0)}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setInspectProduct(product);
                                                setActiveImageIndex(0);
                                            }}
                                            className="text-left font-bold text-xs text-gray-900 dark:text-white hover:text-primary line-clamp-2 transition-colors"
                                        >
                                            {product.title}
                                        </button>
                                    </div>

                                    {/* Seller and relative time */}
                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                                {seller.avatar_url ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={seller.avatar_url}
                                                        alt=""
                                                        className="size-full object-cover rounded-full"
                                                    />
                                                ) : (
                                                    sellerName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate">
                                                {sellerName}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 shrink-0">
                                            {timeAgo(product.created_at)}
                                        </span>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-1 flex items-center justify-between gap-1">
                                        <div className="flex items-center gap-1">
                                            {product.status === 'Pending' && (
                                                <button
                                                    onClick={() => handleStatusUpdate([product.id], 'Active')}
                                                    disabled={actionLoading}
                                                    className="size-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center"
                                                    title="Approve"
                                                >
                                                    <DynamicLucideIcon name="check" className="text-xs" />
                                                </button>
                                            )}
                                            {product.status !== 'Banned' ? (
                                                <button
                                                    onClick={() =>
                                                        setConfirmModal({
                                                            open: true,
                                                            action: 'ban',
                                                            item: product
                                                        })
                                                    }
                                                    disabled={actionLoading}
                                                    className="size-7 rounded-lg bg-gray-100 text-gray-600 dark:bg-[#212b30] dark:text-gray-300 hover:text-rose-600 flex items-center justify-center"
                                                    title="Ban"
                                                >
                                                    <DynamicLucideIcon name="block" className="text-xs" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStatusUpdate([product.id], 'Active')}
                                                    disabled={actionLoading}
                                                    className="size-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center"
                                                    title="Restore"
                                                >
                                                    <DynamicLucideIcon name="refresh" className="text-xs" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() =>
                                                    setConfirmModal({
                                                        open: true,
                                                        action: 'delete',
                                                        item: product
                                                    })
                                                }
                                                disabled={actionLoading}
                                                className="size-7 rounded-lg bg-gray-100 text-gray-600 dark:bg-[#212b30] dark:text-gray-300 hover:text-rose-600 flex items-center justify-center"
                                                title="Delete"
                                            >
                                                <DynamicLucideIcon name="delete" className="text-xs" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setInspectProduct(product);
                                                    setActiveImageIndex(0);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-300 hover:text-primary text-xs font-bold transition-colors"
                                            >
                                                Inspect
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination Controls */}
            {totalFiltered > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Showing <span className="font-bold text-gray-900 dark:text-white">{startRange}</span> to{' '}
                        <span className="font-bold text-gray-900 dark:text-white">{endRange}</span> of{' '}
                        <span className="font-bold text-gray-900 dark:text-white">{totalFiltered}</span> listings
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => updateUrlParams({ page: Math.max(1, currentPage - 1) })}
                            disabled={currentPage <= 1 || isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#182125] text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                        >
                            <DynamicLucideIcon name="chevron_left" className="text-sm" />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                if (totalPages <= 5) {
                                    pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNumber = totalPages - 4 + i;
                                } else {
                                    pageNumber = currentPage - 2 + i;
                                }

                                const isCurrent = pageNumber === currentPage;
                                return (
                                    <button
                                        key={pageNumber}
                                        onClick={() => updateUrlParams({ page: pageNumber })}
                                        disabled={isPending}
                                        className={`size-8 rounded-xl text-xs font-bold transition-all ${
                                            isCurrent
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-white dark:bg-[#182125] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => updateUrlParams({ page: Math.min(totalPages, currentPage + 1) })}
                            disabled={currentPage >= totalPages || isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#182125] text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-colors"
                        >
                            <span>Next</span>
                            <DynamicLucideIcon name="chevron_right" className="text-sm" />
                        </button>
                    </div>
                </div>
            )}

            {/* Product Inspection Modal / Drawer */}
            {inspectProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                        onClick={() => setInspectProduct(null)}
                    />
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-3xl rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Product Inspection
                                </h3>
                                <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                    ID: {inspectProduct.id}
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectProduct(null)}
                                className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <DynamicLucideIcon name="close" className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Image Gallery Column */}
                                <div className="space-y-3">
                                    <div className="aspect-4/3 rounded-2xl bg-gray-100 dark:bg-[#212b30] overflow-hidden relative border border-gray-200 dark:border-gray-800">
                                        {inspectImages.length > 0 ? (
                                            <Image
                                                src={inspectImages[activeImageIndex] || inspectImages[0]}
                                                alt={inspectProduct.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="size-full flex items-center justify-center text-gray-400">
                                                <DynamicLucideIcon name="image" className="text-4xl" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnails Row if multiple */}
                                    {inspectImages.length > 1 && (
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                                            {inspectImages.map((img, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setActiveImageIndex(i)}
                                                    className={`size-14 rounded-xl relative overflow-hidden border-2 shrink-0 transition-all ${
                                                        activeImageIndex === i
                                                            ? 'border-primary shadow-xs'
                                                            : 'border-transparent opacity-70 hover:opacity-100'
                                                    }`}
                                                >
                                                    <Image src={img} alt="" fill className="object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Details Column */}
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {(() => {
                                                const badge = getStatusBadge(inspectProduct.status);
                                                return (
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${badge.dot}`} />
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#212b30] text-gray-600 dark:text-gray-300">
                                                {inspectProduct.category || 'General'}
                                            </span>
                                            {inspectProduct.condition && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#212b30] text-gray-600 dark:text-gray-300">
                                                    {inspectProduct.condition}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                            {inspectProduct.title}
                                        </h2>

                                        <p className="text-xl font-black text-primary mt-2">
                                            GH₵ {formatPrice(inspectProduct.price || 0)}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            Description
                                        </p>
                                        <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto pr-1">
                                            {inspectProduct.description || 'No description provided for this listing.'}
                                        </div>
                                    </div>

                                    {/* Seller Info Card */}
                                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-[#212b30] border border-gray-200/80 dark:border-gray-700/80 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Seller Details
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                                {inspectProduct.seller?.avatar_url ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={inspectProduct.seller.avatar_url}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    (inspectProduct.seller?.display_name || inspectProduct.seller?.email || 'U')
                                                        .charAt(0)
                                                        .toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {inspectProduct.seller?.display_name || 'Anonymous Student'}
                                                    </span>
                                                    {inspectProduct.seller?.is_verified && (
                                                        <DynamicLucideIcon
                                                            name="verified"
                                                            className="text-primary text-xs shrink-0"
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                    {inspectProduct.seller?.email}
                                                </p>
                                                {inspectProduct.seller?.campus && (
                                                    <span className="inline-block text-[10px] font-bold text-primary mt-0.5">
                                                        📍 {inspectProduct.seller.campus}
                                                    </span>
                                                )}
                                            </div>
                                            {inspectProduct.seller?.id && (
                                                <Link
                                                    href={`/dashboard/admin/users/${inspectProduct.seller.id}`}
                                                    target="_blank"
                                                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#182125] transition-colors shrink-0"
                                                >
                                                    View User
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#212b30]/50 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <Link
                                href={`/marketplace/${inspectProduct.id}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                                <span>Open Live Listing</span>
                                <DynamicLucideIcon name="open_in_new" className="text-xs" />
                            </Link>

                            <div className="flex items-center gap-2">
                                {inspectProduct.status !== 'Active' && (
                                    <button
                                        onClick={() => handleStatusUpdate([inspectProduct.id], 'Active')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
                                    >
                                        Approve / Set Active
                                    </button>
                                )}

                                {inspectProduct.status !== 'Banned' ? (
                                    <button
                                        onClick={() => {
                                            setConfirmModal({
                                                open: true,
                                                action: 'ban',
                                                item: inspectProduct
                                            });
                                        }}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-50"
                                    >
                                        Restrict / Ban
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStatusUpdate([inspectProduct.id], 'Active')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
                                    >
                                        Restore Listing
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        setConfirmModal({
                                            open: true,
                                            action: 'delete',
                                            item: inspectProduct
                                        });
                                    }}
                                    disabled={actionLoading}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-600/20 transition-all disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                        onClick={() => !actionLoading && setConfirmModal({ open: false, action: '', item: null })}
                    />
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div
                            className={`size-14 rounded-2xl mx-auto flex items-center justify-center ${
                                confirmModal.action === 'delete' || confirmModal.action === 'batch_delete'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-amber-500/10 text-amber-600'
                            }`}
                        >
                            <DynamicLucideIcon
                                name={
                                    confirmModal.action === 'delete' || confirmModal.action === 'batch_delete'
                                        ? 'delete'
                                        : 'block'
                                }
                                className="text-2xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                {confirmModal.action === 'delete' && 'Delete Product Listing?'}
                                {confirmModal.action === 'batch_delete' && `Delete ${confirmModal.item?.count} Listings?`}
                                {confirmModal.action === 'ban' && 'Ban Product Listing?'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {confirmModal.action === 'delete' &&
                                    'Are you sure you want to permanently delete this listing? This action cannot be undone.'}
                                {confirmModal.action === 'batch_delete' &&
                                    'Are you sure you want to permanently purge all selected listings? This cannot be undone.'}
                                {confirmModal.action === 'ban' &&
                                    'This product will be hidden from campus marketplace searches and public feeds until restored.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal({ open: false, action: '', item: null })}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmModal.action === 'delete') {
                                        handleDelete([confirmModal.item.id]);
                                    } else if (confirmModal.action === 'batch_delete') {
                                        handleDelete(confirmModal.item.ids);
                                    } else if (confirmModal.action === 'ban') {
                                        handleStatusUpdate([confirmModal.item.id], 'Banned');
                                    }
                                }}
                                disabled={actionLoading}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 ${
                                    confirmModal.action === 'delete' || confirmModal.action === 'batch_delete'
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                }`}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div
                        className={`px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-xl text-white text-xs font-bold ${
                            toast.type === 'error' ? 'bg-rose-600 shadow-rose-600/25' : 'bg-gray-900 dark:bg-white dark:text-gray-900 shadow-gray-900/25'
                        }`}
                    >
                        <DynamicLucideIcon
                            name={toast.type === 'error' ? 'error' : 'check_circle'}
                            className="text-base"
                        />
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

