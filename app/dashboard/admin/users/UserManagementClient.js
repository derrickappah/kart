'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { formatPhoneDisplay } from '@/utils/phoneUtils';

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

export default function UserManagementClient({
    initialUsers = [],
    stats = {},
    totalFiltered = 0,
    currentPage = 1,
    pageSize = 20,
    campuses = [],
    currentFilters = {}
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Local filter states
    const [searchQuery, setSearchQuery] = useState(currentFilters.q || '');
    const [selectedCampus, setSelectedCampus] = useState(currentFilters.campus || '');
    const [selectedStatus, setSelectedStatus] = useState(currentFilters.status || '');
    const [selectedRole, setSelectedRole] = useState(currentFilters.role || '');
    const [selectedVerified, setSelectedVerified] = useState(currentFilters.verified || '');
    const [sortBy, setSortBy] = useState(currentFilters.sort || 'newest');

    // UI View & Selection states
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
    const [selectedIds, setSelectedIds] = useState([]);
    const [inspectUser, setInspectUser] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, action: '', item: null });
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [copiedEmail, setCopiedEmail] = useState(null);

    // Synchronize inputs when URL filters change
    useEffect(() => {
        setSearchQuery(currentFilters.q || '');
        setSelectedCampus(currentFilters.campus || '');
        setSelectedStatus(currentFilters.status || '');
        setSelectedRole(currentFilters.role || '');
        setSelectedVerified(currentFilters.verified || '');
        setSortBy(currentFilters.sort || 'newest');
        setSelectedIds([]);
    }, [currentFilters]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    const handleCopyEmail = (email) => {
        if (!email) return;
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        setTimeout(() => setCopiedEmail(null), 2000);
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

        // Reset page to 1 on filter changes unless page is explicitly passed
        if (!('page' in newParams)) {
            params.delete('page');
        }

        startTransition(() => {
            router.push(`/dashboard/admin/users?${params.toString()}`);
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

    const handleClearAllFilters = () => {
        setSearchQuery('');
        setSelectedCampus('');
        setSelectedStatus('');
        setSelectedRole('');
        setSelectedVerified('');
        setSortBy('newest');
        startTransition(() => {
            router.push('/dashboard/admin/users');
        });
    };

    const hasActiveFilters = Boolean(
        currentFilters.q ||
        currentFilters.campus ||
        currentFilters.status ||
        currentFilters.role ||
        currentFilters.verified ||
        (currentFilters.sort && currentFilters.sort !== 'newest')
    );

    // Batch and Selection helpers
    const toggleSelectAll = () => {
        if (selectedIds.length === initialUsers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(initialUsers.map((u) => u.id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Actions (Ban / Unban / Admin Role)
    const handleToggleBan = async (ids, nextBannedStatus) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/users/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds: ids, banned: nextBannedStatus })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update ban status');

            showToast(
                ids.length === 1
                    ? `User ${nextBannedStatus ? 'banned' : 'unbanned'} successfully`
                    : `${ids.length} users ${nextBannedStatus ? 'banned' : 'unbanned'} successfully`
            );
            setSelectedIds([]);
            setConfirmModal({ open: false, action: '', item: null });
            if (inspectUser && ids.includes(inspectUser.id)) {
                setInspectUser((prev) => (prev ? { ...prev, banned: nextBannedStatus } : null));
            }
            router.refresh();
        } catch (err) {
            console.error('Ban error:', err);
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleAdmin = async (userId, nextAdminStatus) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/users/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isAdmin: nextAdminStatus })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update administrative role');

            showToast(`User ${nextAdminStatus ? 'promoted to Super Admin' : 'changed to Student role'}`);
            setConfirmModal({ open: false, action: '', item: null });
            if (inspectUser && inspectUser.id === userId) {
                setInspectUser((prev) => (prev ? { ...prev, is_admin: nextAdminStatus } : null));
            }
            router.refresh();
        } catch (err) {
            console.error('Role update error:', err);
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
    const startRange = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRange = Math.min(currentPage * pageSize, totalFiltered);

    return (
        <div className="space-y-6">
            {/* Header with Title and Quick Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        User Directory
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {stats.total || 0} Members
                        </span>
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Monitor campus students, manage permissions, and audit platform accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.refresh()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#182125] hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all active:scale-95"
                        title="Refresh user list"
                    >
                        <DynamicLucideIcon name="refresh" className={`text-base ${isPending ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* KPI Metrics Row - Clickable Cards to filter by status / role */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                    {
                        label: 'Total Members',
                        value: stats.total,
                        filter: { status: '', role: '', verified: '' },
                        icon: 'group',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                        activeBorder: 'border-primary',
                        isActive: !selectedStatus && !selectedRole && !selectedVerified
                    },
                    {
                        label: 'Active Students',
                        value: stats.active,
                        filter: { status: 'Active', role: '', verified: '' },
                        icon: 'person_check',
                        color: 'text-emerald-600 dark:text-emerald-400',
                        bg: 'bg-emerald-500/10',
                        activeBorder: 'border-emerald-500',
                        isActive: selectedStatus === 'Active'
                    },
                    {
                        label: 'Super Admins',
                        value: stats.admins,
                        filter: { role: 'admin', status: '', verified: '' },
                        icon: 'shield_person',
                        color: 'text-purple-600 dark:text-purple-400',
                        bg: 'bg-purple-500/10',
                        activeBorder: 'border-purple-500',
                        isActive: selectedRole === 'admin'
                    },
                    {
                        label: 'Banned Accounts',
                        value: stats.banned,
                        filter: { status: 'Banned', role: '', verified: '' },
                        icon: 'person_off',
                        color: 'text-rose-600 dark:text-rose-400',
                        bg: 'bg-rose-500/10',
                        activeBorder: 'border-rose-500',
                        badge: stats.banned > 0 ? `${stats.banned} Restricted` : null,
                        isActive: selectedStatus === 'Banned'
                    },
                    {
                        label: 'Verified Students',
                        value: stats.verified || 0,
                        filter: { verified: 'true', status: '', role: '' },
                        icon: 'verified',
                        color: 'text-teal-600 dark:text-teal-400',
                        bg: 'bg-teal-500/10',
                        activeBorder: 'border-teal-500',
                        isActive: selectedVerified === 'true'
                    }
                ].map((kpi, idx) => (
                    <button
                        key={idx}
                        onClick={() => updateUrlParams(kpi.filter)}
                        className={`p-4 rounded-2xl text-left border transition-all relative overflow-hidden group ${
                            kpi.isActive
                                ? `bg-white dark:bg-[#1e282d] border-2 ${kpi.activeBorder} shadow-md`
                                : 'bg-white/80 dark:bg-[#182125]/80 border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                        }`}
                    >
                        {kpi.badge && (
                            <span className="absolute top-3 right-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
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
                ))}
            </div>

            {/* Quick Status Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { label: 'All Users', filter: { status: '', role: '', verified: '' }, count: stats.total, active: !selectedStatus && !selectedRole && !selectedVerified },
                    { label: 'Active', filter: { status: 'Active', role: '', verified: '' }, count: stats.active, active: selectedStatus === 'Active' },
                    { label: 'Admins', filter: { role: 'admin', status: '', verified: '' }, count: stats.admins, active: selectedRole === 'admin' },
                    { label: 'Banned', filter: { status: 'Banned', role: '', verified: '' }, count: stats.banned, active: selectedStatus === 'Banned', alert: stats.banned > 0 },
                    { label: 'Verified', filter: { verified: 'true', status: '', role: '' }, count: stats.verified, active: selectedVerified === 'true' }
                ].map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => updateUrlParams(tab.filter)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            tab.active
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                                : 'bg-white dark:bg-[#182125] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                tab.active
                                    ? 'bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900'
                                    : tab.alert
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {tab.count || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Toolbar: Search, Filters, Sort, View Switcher */}
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
                            placeholder="Search by name, email, or phone..."
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
                        {/* Campus Filter */}
                        <div className="relative">
                            <select
                                value={selectedCampus}
                                onChange={(e) => {
                                    setSelectedCampus(e.target.value);
                                    updateUrlParams({ campus: e.target.value });
                                }}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="">All Campuses</option>
                                {campuses.map((c) => (
                                    <option key={c.name} value={c.name}>
                                        {c.abbreviation ? `${c.abbreviation} - ${c.name}` : c.name}
                                    </option>
                                ))}
                            </select>
                            <DynamicLucideIcon
                                name="expand_more"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"
                            />
                        </div>

                        {/* Role Filter */}
                        <div className="relative">
                            <select
                                value={selectedRole}
                                onChange={(e) => {
                                    setSelectedRole(e.target.value);
                                    updateUrlParams({ role: e.target.value });
                                }}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="">All Roles</option>
                                <option value="admin">Super Admins</option>
                                <option value="user">Regular Students</option>
                            </select>
                            <DynamicLucideIcon
                                name="expand_more"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"
                            />
                        </div>

                        {/* Verification Status Filter */}
                        <div className="relative">
                            <select
                                value={selectedVerified}
                                onChange={(e) => {
                                    setSelectedVerified(e.target.value);
                                    updateUrlParams({ verified: e.target.value });
                                }}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="">All Verification</option>
                                <option value="true">Verified Students</option>
                                <option value="false">Unverified</option>
                            </select>
                            <DynamicLucideIcon
                                name="expand_more"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value);
                                    updateUrlParams({ sort: e.target.value });
                                }}
                                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#212b30] text-xs font-bold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 focus:ring-primary/40 outline-none cursor-pointer"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="name_asc">Name: A to Z</option>
                                <option value="name_desc">Name: Z to A</option>
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
                                    Query: &quot;{currentFilters.q}&quot;
                                    <button onClick={handleClearSearch} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                            {currentFilters.campus && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Campus: {currentFilters.campus}
                                    <button onClick={() => updateUrlParams({ campus: '' })} className="hover:text-rose-500">
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
                            {currentFilters.role && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Role: {currentFilters.role === 'admin' ? 'Super Admin' : 'Regular Student'}
                                    <button onClick={() => updateUrlParams({ role: '' })} className="hover:text-rose-500">
                                        <DynamicLucideIcon name="close" className="text-xs" />
                                    </button>
                                </span>
                            )}
                            {currentFilters.verified && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 font-semibold">
                                    Verification: {currentFilters.verified === 'true' ? 'Verified' : 'Unverified'}
                                    <button onClick={() => updateUrlParams({ verified: '' })} className="hover:text-rose-500">
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
                            {selectedIds.length === 1 ? '1 user selected' : `${selectedIds.length} users selected`}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() =>
                                setConfirmModal({
                                    open: true,
                                    action: 'batch_ban',
                                    item: { count: selectedIds.length, ids: selectedIds }
                                })
                            }
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="person_off" className="text-sm" />
                            <span>Ban Selected</span>
                        </button>

                        <button
                            onClick={() => handleToggleBan(selectedIds, false)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="person_check" className="text-sm" />
                            <span>Unban Selected</span>
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
            {initialUsers.length === 0 ? (
                <div className="bg-white dark:bg-[#182125] rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center space-y-4">
                    <div className="size-16 rounded-2xl bg-gray-100 dark:bg-[#212b30] flex items-center justify-center mx-auto text-gray-400">
                        <DynamicLucideIcon name="group" className="text-3xl" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">No users found</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            No member accounts match your active search filters. Try adjusting your search query or clear the filters.
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
                                                initialUsers.length > 0 &&
                                                selectedIds.length === initialUsers.length
                                            }
                                            onChange={toggleSelectAll}
                                            className="rounded text-primary focus:ring-primary cursor-pointer size-4"
                                        />
                                    </th>
                                    <th className="px-4 py-3.5">User Profile</th>
                                    <th className="px-4 py-3.5">Campus & Contact</th>
                                    <th className="px-4 py-3.5">Role & Compliance</th>
                                    <th className="px-4 py-3.5">Registered</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {initialUsers.map((user) => {
                                    const isSelected = selectedIds.includes(user.id);
                                    const displayName = user.display_name || user.email?.split('@')[0] || 'Anonymous';

                                    return (
                                        <tr
                                            key={user.id}
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
                                                    onChange={() => toggleSelectOne(user.id)}
                                                    className="rounded text-primary focus:ring-primary cursor-pointer size-4"
                                                />
                                            </td>

                                            {/* User Profile */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setInspectUser(user)}
                                                        className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                                                    >
                                                        {user.avatar_url ? (
                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                            <img
                                                                src={user.avatar_url}
                                                                alt=""
                                                                className="size-full object-cover"
                                                            />
                                                        ) : (
                                                            displayName.charAt(0).toUpperCase()
                                                        )}
                                                    </button>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <Link
                                                                href={`/dashboard/admin/users/${user.id}`}
                                                                className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate hover:underline"
                                                            >
                                                                {displayName}
                                                            </Link>
                                                            {user.is_verified && (
                                                                <DynamicLucideIcon
                                                                    name="verified"
                                                                    className="text-primary text-xs shrink-0"
                                                                    title="Verified Student"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                                                {user.email}
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopyEmail(user.email)}
                                                                className="text-gray-400 hover:text-primary transition-colors"
                                                                title="Copy email address"
                                                            >
                                                                <DynamicLucideIcon
                                                                    name={copiedEmail === user.email ? 'check' : 'attachment'}
                                                                    className="text-[11px]"
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Campus & Contact */}
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-0.5">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200 text-xs font-bold">
                                                        {user.campus || 'No Campus Set'}
                                                    </span>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                        {user.phone ? formatPhoneDisplay(user.phone) : 'No phone linked'}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Role & Compliance Status */}
                                            <td className="px-4 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {/* Role Badge (Fixing previously broken bug where regular users were called Admin User) */}
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            user.is_admin
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50'
                                                                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                                        }`}
                                                    >
                                                        <DynamicLucideIcon
                                                            name={user.is_admin ? 'shield' : 'person'}
                                                            className="text-[10px]"
                                                        />
                                                        {user.is_admin ? 'Super Admin' : 'Student'}
                                                    </span>

                                                    {/* Ban Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            user.banned
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`size-1.5 rounded-full ${
                                                                user.banned ? 'bg-rose-500' : 'bg-emerald-500'
                                                            }`}
                                                        />
                                                        {user.banned ? 'Banned' : 'Active'}
                                                    </span>

                                                    {/* Verification Status */}
                                                    {user.is_verified && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50">
                                                            Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Registered Date */}
                                            <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                <div>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                                                        {new Date(user.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {timeAgo(user.created_at)}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Quick Inspect Drawer */}
                                                    <button
                                                        onClick={() => setInspectUser(user)}
                                                        className="size-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-[#212b30] dark:hover:bg-gray-800 dark:text-gray-300 flex items-center justify-center transition-colors"
                                                        title="Inspect User Details"
                                                    >
                                                        <DynamicLucideIcon name="visibility" className="text-sm" />
                                                    </button>

                                                    {/* Ban / Unban Button */}
                                                    <button
                                                        onClick={() =>
                                                            setConfirmModal({
                                                                open: true,
                                                                action: user.banned ? 'unban' : 'ban',
                                                                item: user
                                                            })
                                                        }
                                                        disabled={actionLoading || user.is_admin}
                                                        className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
                                                            user.banned
                                                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300'
                                                                : 'bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-600 dark:bg-[#212b30] dark:hover:bg-rose-950/40 dark:text-gray-300 dark:hover:text-rose-400 disabled:opacity-40 disabled:hover:text-gray-400'
                                                        }`}
                                                        title={
                                                            user.is_admin
                                                                ? 'Admin accounts cannot be banned'
                                                                : user.banned
                                                                ? 'Unban User'
                                                                : 'Ban User'
                                                        }
                                                    >
                                                        <DynamicLucideIcon
                                                            name={user.banned ? 'person_check' : 'person_off'}
                                                            className="text-sm"
                                                        />
                                                    </button>

                                                    {/* Role Toggle Button */}
                                                    <button
                                                        onClick={() =>
                                                            setConfirmModal({
                                                                open: true,
                                                                action: 'toggle_role',
                                                                item: user
                                                            })
                                                        }
                                                        disabled={actionLoading}
                                                        className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
                                                            user.is_admin
                                                                ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300'
                                                                : 'bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-600 dark:bg-[#212b30] dark:hover:bg-purple-950/40 dark:text-gray-300 dark:hover:text-purple-400'
                                                        }`}
                                                        title={user.is_admin ? 'Demote from Admin' : 'Promote to Admin'}
                                                    >
                                                        <DynamicLucideIcon name="admin_panel_settings" className="text-sm" />
                                                    </button>

                                                    {/* Link to Full Profile */}
                                                    <Link
                                                        href={`/dashboard/admin/users/${user.id}`}
                                                        className="size-8 rounded-lg bg-gray-100 hover:bg-primary/10 text-gray-600 hover:text-primary dark:bg-[#212b30] dark:hover:bg-primary/10 dark:text-gray-300 dark:hover:text-primary flex items-center justify-center transition-colors"
                                                        title="View 360° Profile"
                                                    >
                                                        <DynamicLucideIcon name="open_in_new" className="text-sm" />
                                                    </Link>
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
                /* Cards Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {initialUsers.map((user) => {
                        const isSelected = selectedIds.includes(user.id);
                        const displayName = user.display_name || user.email?.split('@')[0] || 'Anonymous';

                        return (
                            <div
                                key={user.id}
                                className={`bg-white dark:bg-[#182125] rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-4 group ${
                                    isSelected
                                        ? 'border-2 border-primary shadow-md'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm'
                                }`}
                            >
                                <div className="space-y-3">
                                    {/* Top Card Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(user.id)}
                                                className="rounded text-primary focus:ring-primary cursor-pointer size-4 shrink-0"
                                            />
                                            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                                {user.avatar_url ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={user.avatar_url}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    displayName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    href={`/dashboard/admin/users/${user.id}`}
                                                    className="font-bold text-xs text-gray-900 dark:text-white hover:text-primary transition-colors truncate block hover:underline"
                                                >
                                                    {displayName}
                                                </Link>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span
                                            className={`size-2 rounded-full shrink-0 ${
                                                user.banned ? 'bg-rose-500' : 'bg-emerald-500'
                                            }`}
                                            title={user.banned ? 'Banned' : 'Active'}
                                        />
                                    </div>

                                    {/* Metadata Pills */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-200">
                                            📍 {user.campus || 'No Campus'}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                user.is_admin
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                        >
                                            {user.is_admin ? 'Super Admin' : 'Student'}
                                        </span>
                                        {user.is_verified && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Footer & Actions */}
                                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1">
                                    <span className="text-[10px] text-gray-400">
                                        {timeAgo(user.created_at)}
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setInspectUser(user)}
                                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#212b30] text-gray-700 dark:text-gray-300 hover:text-primary text-xs font-bold transition-colors"
                                        >
                                            Inspect
                                        </button>

                                        <button
                                            onClick={() =>
                                                setConfirmModal({
                                                    open: true,
                                                    action: user.banned ? 'unban' : 'ban',
                                                    item: user
                                                })
                                            }
                                            disabled={actionLoading || user.is_admin}
                                            className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
                                                user.banned
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-[#212b30] dark:text-gray-300 hover:text-rose-600 disabled:opacity-40'
                                            }`}
                                            title={user.banned ? 'Unban' : 'Ban'}
                                        >
                                            <DynamicLucideIcon
                                                name={user.banned ? 'person_check' : 'person_off'}
                                                className="text-xs"
                                            />
                                        </button>
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
                        <span className="font-bold text-gray-900 dark:text-white">{totalFiltered}</span> members
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

            {/* User Quick Inspect Modal / Drawer */}
            {inspectUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                        onClick={() => setInspectUser(null)}
                    />
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-xl rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                    Member Profile Summary
                                </h3>
                                <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                    UUID: {inspectUser.id}
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectUser(null)}
                                className="size-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <DynamicLucideIcon name="close" className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* User Main Identity */}
                            <div className="flex items-center gap-4">
                                <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0 overflow-hidden">
                                    {inspectUser.avatar_url ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={inspectUser.avatar_url}
                                            alt=""
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        (inspectUser.display_name || inspectUser.email || 'U').charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-black text-gray-900 dark:text-white truncate">
                                            {inspectUser.display_name || 'Anonymous Student'}
                                        </h2>
                                        {inspectUser.is_verified && (
                                            <DynamicLucideIcon
                                                name="verified"
                                                className="text-primary text-sm shrink-0"
                                            />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                                        {inspectUser.email}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                inspectUser.is_admin
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                            }`}
                                        >
                                            {inspectUser.is_admin ? 'Super Admin' : 'Student'}
                                        </span>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                inspectUser.banned
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            }`}
                                        >
                                            {inspectUser.banned ? 'Banned' : 'Active Account'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#212b30] border border-gray-200/80 dark:border-gray-700/80 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Campus
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                                        {inspectUser.campus || 'Not specified'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Phone Number
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                                        {inspectUser.phone ? formatPhoneDisplay(inspectUser.phone) : 'Not linked'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Joined Date
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                                        {new Date(inspectUser.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        Verification
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                                        {inspectUser.is_verified ? 'Verified Student' : 'Unverified'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#212b30]/50 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <Link
                                href={`/dashboard/admin/users/${inspectUser.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                            >
                                <span>View 360° Profile</span>
                                <DynamicLucideIcon name="open_in_new" className="text-xs" />
                            </Link>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() =>
                                        setConfirmModal({
                                            open: true,
                                            action: inspectUser.banned ? 'unban' : 'ban',
                                            item: inspectUser
                                        })
                                    }
                                    disabled={actionLoading || inspectUser.is_admin}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                                        inspectUser.banned
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                                    }`}
                                >
                                    {inspectUser.banned ? 'Unban User' : 'Ban User'}
                                </button>

                                <button
                                    onClick={() =>
                                        setConfirmModal({
                                            open: true,
                                            action: 'toggle_role',
                                            item: inspectUser
                                        })
                                    }
                                    disabled={actionLoading}
                                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm shadow-purple-600/20 transition-all disabled:opacity-50"
                                >
                                    {inspectUser.is_admin ? 'Demote to Student' : 'Promote to Admin'}
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
                                confirmModal.action === 'ban' || confirmModal.action === 'batch_ban'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : confirmModal.action === 'toggle_role'
                                    ? 'bg-purple-500/10 text-purple-600'
                                    : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                        >
                            <DynamicLucideIcon
                                name={
                                    confirmModal.action === 'ban' || confirmModal.action === 'batch_ban'
                                        ? 'person_off'
                                        : confirmModal.action === 'toggle_role'
                                        ? 'shield'
                                        : 'person_check'
                                }
                                className="text-2xl"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                {confirmModal.action === 'ban' && 'Ban User Account?'}
                                {confirmModal.action === 'unban' && 'Unban User Account?'}
                                {confirmModal.action === 'batch_ban' && `Ban ${confirmModal.item?.count} Accounts?`}
                                {confirmModal.action === 'toggle_role' &&
                                    (confirmModal.item?.is_admin
                                        ? 'Revoke Admin Privileges?'
                                        : 'Promote User to Admin?')}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                {confirmModal.action === 'ban' &&
                                    'This user will immediately be blocked from logging in, listing products, and messaging others.'}
                                {confirmModal.action === 'unban' &&
                                    'This user will regain access to their account, marketplace listings, and features.'}
                                {confirmModal.action === 'batch_ban' &&
                                    'Selected accounts will be restricted from platform access until unbanned.'}
                                {confirmModal.action === 'toggle_role' &&
                                    (confirmModal.item?.is_admin
                                        ? 'This user will lose administrative access to the admin dashboard and moderations.'
                                        : 'This user will receive full administrative access to manage products, users, and platform settings.')}
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
                                    if (confirmModal.action === 'ban') {
                                        handleToggleBan([confirmModal.item.id], true);
                                    } else if (confirmModal.action === 'unban') {
                                        handleToggleBan([confirmModal.item.id], false);
                                    } else if (confirmModal.action === 'batch_ban') {
                                        handleToggleBan(confirmModal.item.ids, true);
                                    } else if (confirmModal.action === 'toggle_role') {
                                        handleToggleAdmin(confirmModal.item.id, !confirmModal.item.is_admin);
                                    }
                                }}
                                disabled={actionLoading}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 ${
                                    confirmModal.action === 'ban' || confirmModal.action === 'batch_ban'
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                        : confirmModal.action === 'toggle_role'
                                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
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
                            toast.type === 'error'
                                ? 'bg-rose-600 shadow-rose-600/25'
                                : 'bg-gray-900 dark:bg-white dark:text-gray-900 shadow-gray-900/25'
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


