'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/client';

export default function UserDetailsClient({
    profile,
    wallet,
    products = [],
    orders = [],
    walletTransactions = []
}) {
    const [profileState, setProfileState] = useState(profile);
    const [loading, setLoading] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const toggleBan = async () => {
        const nextStatus = !profileState.banned;
        if (!confirm(`Are you sure you want to ${nextStatus ? 'ban' : 'unban'} this user?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ banned: nextStatus })
                .eq('id', profileState.id);

            if (error) throw error;

            setProfileState(prev => ({ ...prev, banned: nextStatus }));
            router.refresh();
        } catch (err) {
            alert('Error updating ban status: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleAdmin = async () => {
        const nextStatus = !profileState.is_admin;
        if (!confirm(`Are you sure you want to ${nextStatus ? 'promote' : 'revoke admin status from'} this user?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: nextStatus })
                .eq('id', profileState.id);

            if (error) throw error;

            setProfileState(prev => ({ ...prev, is_admin: nextStatus }));
            router.refresh();
        } catch (err) {
            alert('Error updating admin status: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleVerification = async () => {
        const nextStatus = !profileState.is_verified;
        if (!confirm(`Are you sure you want to ${nextStatus ? 'verify' : 'unverify'} this user?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_verified: nextStatus,
                    verification_status: nextStatus ? 'Approved' : 'Unverified'
                })
                .eq('id', profileState.id);

            if (error) throw error;

            setProfileState(prev => ({ 
                ...prev, 
                is_verified: nextStatus,
                verification_status: nextStatus ? 'Approved' : 'Unverified'
            }));
            router.refresh();
        } catch (err) {
            alert('Error updating verification status: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Style helper for badges
    const getBadgeStyle = (banned, isAdmin, isVerified) => {
        if (banned) return 'bg-red-500/10 text-red-600 border border-red-500/20';
        if (isAdmin) return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
        if (isVerified) return 'bg-green-500/10 text-green-600 border border-green-500/20';
        return 'bg-[#4b636c]/10 text-[#4b636c] border border-transparent';
    };

    return (
        <div className="space-y-6">
            {/* Header & Back Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link
                        href="/dashboard/admin/users"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#4b636c] hover:text-primary transition-colors mb-2"
                    >
                        <DynamicLucideIcon name="arrow_back" className="text-sm" />
                        Back to User Directory
                    </Link>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        User Profile Inspection
                        <span className={`text-xs px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${getBadgeStyle(profileState.banned, profileState.is_admin, profileState.is_verified)}`}>
                            {profileState.banned ? 'Banned' : profileState.is_admin ? 'Super Admin' : profileState.is_verified ? 'Verified Seller' : 'Registered User'}
                        </span>
                    </h1>
                    <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest">
                        System User ID: {profileState.id}
                    </p>
                </div>
            </div>

            {/* Hero Section Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Summary Card */}
                <div className="lg:col-span-1 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col items-center text-center space-y-4">
                    <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center font-black text-4xl text-primary overflow-hidden border-2 border-primary/20">
                        {profileState.avatar_url ? (
                            <img src={profileState.avatar_url} alt="" className="size-full object-cover" />
                        ) : (
                            profileState.display_name?.[0]?.toUpperCase() || 'U'
                        )}
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-lg font-black">{profileState.display_name || 'Anonymous User'}</h2>
                        <p className="text-xs text-primary font-bold">@{profileState.username || 'username_not_set'}</p>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-wider">{profileState.full_name || 'No Full Name Provided'}</p>
                    </div>

                    <div className="w-full border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">Reputation Rating</p>
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                <DynamicLucideIcon name="star" className="text-amber-500 text-sm" />
                                <span className="text-sm font-black">{parseFloat(profileState.average_rating || 0).toFixed(1)}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">Total Reviews</p>
                            <p className="text-sm font-black mt-0.5">{profileState.total_reviews || 0}</p>
                        </div>
                    </div>

                    {profileState.bio && (
                        <div className="w-full bg-background-light dark:bg-[#212b30]/50 p-3.5 rounded-xl text-xs text-[#4b636c] italic leading-relaxed">
                            "{profileState.bio}"
                        </div>
                    )}
                </div>

                {/* Financial / Payout Card */}
                <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between border-b border-[#dce3e5] dark:border-[#2d3b41] pb-4 mb-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] flex items-center gap-2">
                                <DynamicLucideIcon name="account_balance_wallet" className="text-primary text-base" />
                                Wallet & Financial Details
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md">
                                Live Registry
                            </span>
                        </div>

                        {/* Balance Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">Active Balance</p>
                                <h4 className="text-2xl font-black text-primary mt-1">
                                    {wallet?.currency || 'GHS'} {parseFloat(wallet?.balance || 0).toFixed(2)}
                                </h4>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">Pending Escrow Balance</p>
                                <h4 className="text-2xl font-black text-amber-500 mt-1">
                                    {wallet?.currency || 'GHS'} {parseFloat(wallet?.pending_balance || 0).toFixed(2)}
                                </h4>
                            </div>
                        </div>

                        {/* Payout Channels */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Mobile Money */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[#4b636c] flex items-center gap-1.5">
                                    <DynamicLucideIcon name="phone_android" className="text-sm" />
                                    Mobile Money (MoMo)
                                </h4>
                                {profileState.momo_details?.number ? (
                                    <div className="bg-background-light dark:bg-[#212b30]/50 p-3.5 rounded-xl border border-transparent dark:border-[#2d3b41] space-y-1 text-xs">
                                        <p className="font-bold flex items-center justify-between">
                                            <span>Provider:</span>
                                            <span className="font-black text-primary uppercase">{profileState.momo_details.provider}</span>
                                        </p>
                                        <p className="font-bold flex items-center justify-between">
                                            <span>Name:</span>
                                            <span className="font-black truncate max-w-[120px]">{profileState.momo_details.name}</span>
                                        </p>
                                        <p className="font-bold flex items-center justify-between gap-2">
                                            <span>Number:</span>
                                            <span className="font-black flex items-center gap-1">
                                                {profileState.momo_details.number}
                                                <button
                                                    onClick={() => handleCopy(profileState.momo_details.number, 'momo')}
                                                    className="hover:text-primary transition-colors p-0.5"
                                                    title="Copy Number"
                                                >
                                                    <DynamicLucideIcon name={copiedField === 'momo' ? 'check' : 'content_copy'} className="text-[12px]" />
                                                </button>
                                            </span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#4b636c] italic">No Mobile Money Details Set</p>
                                )}
                            </div>

                            {/* Bank Details */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-[#4b636c] flex items-center gap-1.5">
                                    <DynamicLucideIcon name="account_balance" className="text-sm" />
                                    Bank Account
                                </h4>
                                {profileState.bank_account_details?.account_number ? (
                                    <div className="bg-background-light dark:bg-[#212b30]/50 p-3.5 rounded-xl border border-transparent dark:border-[#2d3b41] space-y-1 text-xs">
                                        <p className="font-bold flex items-center justify-between">
                                            <span>Bank:</span>
                                            <span className="font-black text-primary">{profileState.bank_account_details.bank_name}</span>
                                        </p>
                                        <p className="font-bold flex items-center justify-between">
                                            <span>Name:</span>
                                            <span className="font-black truncate max-w-[120px]">{profileState.bank_account_details.account_name}</span>
                                        </p>
                                        <p className="font-bold flex items-center justify-between gap-2">
                                            <span>Number:</span>
                                            <span className="font-black flex items-center gap-1">
                                                {profileState.bank_account_details.account_number}
                                                <button
                                                    onClick={() => handleCopy(profileState.bank_account_details.account_number, 'bank')}
                                                    className="hover:text-primary transition-colors p-0.5"
                                                    title="Copy Number"
                                                >
                                                    <DynamicLucideIcon name={copiedField === 'bank' ? 'check' : 'content_copy'} className="text-[12px]" />
                                                </button>
                                            </span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#4b636c] italic">No Bank Account Details Set</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#dce3e5] dark:border-[#2d3b41] pt-4 mt-6 text-[10px] text-[#4b636c] font-black uppercase tracking-widest flex items-center justify-between">
                        <span>Registry Created: {wallet?.created_at ? new Date(wallet.created_at).toLocaleDateString() : 'N/A'}</span>
                        <span>Last Synced: {wallet?.updated_at ? new Date(wallet.updated_at).toLocaleTimeString() : 'Never'}</span>
                    </div>
                </div>
            </div>

            {/* Profile Info & Operations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Contact & Locality Details */}
                <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] border-b border-[#dce3e5] dark:border-[#2d3b41] pb-3 flex items-center gap-2">
                        <DynamicLucideIcon name="contact_mail" className="text-primary text-base" />
                        Directory Details & Coordinates
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Email Address</p>
                            <p className="font-black flex items-center justify-between gap-2">
                                <span className="truncate">{profileState.email}</span>
                                <button
                                    onClick={() => handleCopy(profileState.email, 'email')}
                                    className="hover:text-primary transition-colors"
                                >
                                    <DynamicLucideIcon name={copiedField === 'email' ? 'check' : 'content_copy'} className="text-[12px]" />
                                </button>
                            </p>
                        </div>

                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Phone Number</p>
                            <p className="font-black flex items-center justify-between gap-2">
                                <span>{profileState.phone || 'N/A'}</span>
                                {profileState.phone && (
                                    <button
                                        onClick={() => handleCopy(profileState.phone, 'phone')}
                                        className="hover:text-primary transition-colors"
                                    >
                                        <DynamicLucideIcon name={copiedField === 'phone' ? 'check' : 'content_copy'} className="text-[12px]" />
                                    </button>
                                )}
                            </p>
                        </div>

                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Campus Locality</p>
                            <p className="font-black flex items-center gap-1.5">
                                <DynamicLucideIcon name="location_on" className="text-primary text-[14px]" />
                                {profileState.campus || 'Not Provided'}
                            </p>
                        </div>

                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Student ID Card Registry</p>
                            <p className="font-black flex items-center justify-between gap-2">
                                <span>{profileState.student_id || 'Not Linked'}</span>
                                {profileState.student_id && (
                                    <button
                                        onClick={() => handleCopy(profileState.student_id, 'studentId')}
                                        className="hover:text-primary transition-colors"
                                    >
                                        <DynamicLucideIcon name={copiedField === 'studentId' ? 'check' : 'content_copy'} className="text-[12px]" />
                                    </button>
                                )}
                            </p>
                        </div>

                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Instagram Handler</p>
                            {profileState.instagram ? (
                                <a
                                    href={`https://instagram.com/${profileState.instagram}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-black text-primary hover:underline flex items-center gap-1.5"
                                >
                                    <DynamicLucideIcon name="link" className="text-[14px]" />
                                    @{profileState.instagram}
                                </a>
                            ) : (
                                <p className="font-black text-gray-400">None</p>
                            )}
                        </div>

                        <div className="space-y-1 bg-background-light dark:bg-[#212b30]/30 p-3 rounded-xl">
                            <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Snapchat Handler</p>
                            {profileState.snapchat ? (
                                <a
                                    href={`https://snapchat.com/add/${profileState.snapchat}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-black text-primary hover:underline flex items-center gap-1.5"
                                >
                                    <DynamicLucideIcon name="link" className="text-[14px]" />
                                    @{profileState.snapchat}
                                </a>
                            ) : (
                                <p className="font-black text-gray-400">None</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] text-[#4b636c] font-black uppercase tracking-widest pt-2">
                        <p>Registered Date: {new Date(profileState.created_at).toLocaleString()}</p>
                        <p>Last Sync: {profileState.updated_at ? new Date(profileState.updated_at).toLocaleString() : 'N/A'}</p>
                    </div>
                </div>

                {/* Direct Administrative Actions */}
                <div className="lg:col-span-1 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] space-y-4 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] border-b border-[#dce3e5] dark:border-[#2d3b41] pb-3 flex items-center gap-2">
                            <DynamicLucideIcon name="admin_panel_settings" className="text-primary text-base" />
                            Administrative Controls
                        </h3>
                        <p className="text-[10px] text-[#4b636c] leading-relaxed mt-2 uppercase tracking-wide">
                            Authorized administrators can perform instant, global operations on user accounts. Actions log audits automatically.
                        </p>
                    </div>

                    <div className="space-y-3 pt-4">
                        {/* Toggle Ban */}
                        <button
                            onClick={toggleBan}
                            disabled={loading || profileState.is_admin}
                            className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${profileState.banned
                                ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20'
                                : 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                                } disabled:opacity-50`}
                        >
                            <DynamicLucideIcon name={profileState.banned ? 'undo' : 'block'} className="text-sm" />
                            {profileState.banned ? 'Unban User Account' : 'Ban User Account'}
                        </button>

                        {/* Toggle Admin */}
                        <button
                            onClick={toggleAdmin}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${profileState.is_admin
                                ? 'bg-[#4b636c] text-white hover:bg-[#5b7882]'
                                : 'bg-purple-500 text-white hover:bg-purple-600 shadow-lg shadow-purple-500/20'
                                } disabled:opacity-50`}
                        >
                            <DynamicLucideIcon name="shield" className="text-sm" />
                            {profileState.is_admin ? 'Revoke Super Admin Status' : 'Promote to Super Admin'}
                        </button>

                        {/* Toggle Verification Badge */}
                        <button
                            onClick={toggleVerification}
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${profileState.is_verified
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20'
                                } disabled:opacity-50`}
                        >
                            <DynamicLucideIcon name={profileState.is_verified ? 'verified_user' : 'verified'} className="text-sm" />
                            {profileState.is_verified ? 'Revoke Verification Badge' : 'Verify Merchant Profile'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Listed Products Inventory */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="p-6 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] flex items-center gap-2">
                        <DynamicLucideIcon name="inventory_2" className="text-primary text-base" />
                        Listed Inventory Assets ({products.length})
                    </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                    {products.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                    <th className="px-6 py-4">Asset Details</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Financial Price</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Analytics</th>
                                    <th className="px-6 py-4">Listed Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41] text-xs font-bold">
                                {products.map(product => (
                                    <tr key={product.id} className="hover:bg-primary/[0.01] transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-lg bg-gray-100 dark:bg-[#212b30] flex-shrink-0 overflow-hidden relative border border-[#dce3e5] dark:border-[#2d3b41]">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt="" className="size-full object-cover" />
                                                    ) : (
                                                        <div className="size-full flex items-center justify-center text-gray-300">
                                                            <DynamicLucideIcon name="image" className="text-lg" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <a
                                                        href={`/marketplace/${product.id}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm font-black text-[#111618] dark:text-gray-200 hover:text-primary transition-colors line-clamp-1"
                                                    >
                                                        {product.title}
                                                    </a>
                                                    <span className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter block">ID: {product.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-black text-[#111618] dark:text-gray-300 uppercase tracking-tighter">
                                            {product.category}
                                        </td>
                                        <td className="px-6 py-3 font-black text-primary">
                                            {product.currency || 'GHS'} {parseFloat(product.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${product.status === 'Active'
                                                ? 'bg-green-500/10 text-green-600'
                                                : product.status === 'Banned'
                                                    ? 'bg-red-500/10 text-red-600'
                                                    : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                {product.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-[#4b636c]">
                                            <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-tighter">
                                                <span className="flex items-center gap-0.5" title="Views"><DynamicLucideIcon name="visibility" className="text-xs" /> {product.views_count || 0}</span>
                                                <span className="flex items-center gap-0.5" title="Likes"><DynamicLucideIcon name="thumb_up" className="text-xs" /> {product.likes_count || 0}</span>
                                                <span className="flex items-center gap-0.5" title="Stock"><DynamicLucideIcon name="inventory" className="text-xs" /> {product.stock_quantity || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-[#4b636c]">
                                            {new Date(product.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-[#4b636c] italic text-xs">
                            No listed products in registry.
                        </div>
                    )}
                </div>
            </div>

            {/* Transactions Ledger */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="p-6 border-b border-[#dce3e5] dark:border-[#2d3b41]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] flex items-center gap-2">
                        <DynamicLucideIcon name="receipt_long" className="text-primary text-base" />
                        Wallet Transaction Ledger ({walletTransactions.length})
                    </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                    {walletTransactions.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                    <th className="px-6 py-4">Transaction ID / Reference</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Value Amount</th>
                                    <th className="px-6 py-4">Ledger Range (Before / After)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Posting Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41] text-xs font-bold">
                                {walletTransactions.map(tx => {
                                    const isDebit = tx.amount < 0 || tx.transaction_type === 'WITHDRAWAL' || tx.transaction_type === 'PURCHASE';
                                    return (
                                        <tr key={tx.id} className="hover:bg-primary/[0.01] transition-colors">
                                            <td className="px-6 py-3 font-mono">
                                                <p className="font-black text-[#111618] dark:text-gray-200 uppercase truncate max-w-[120px]" title={tx.id}>{tx.id.slice(0, 8)}</p>
                                                <span className="text-[10px] text-[#4b636c] uppercase tracking-widest">{tx.reference || 'No Ref'}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tx.transaction_type === 'DEPOSIT'
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : tx.transaction_type === 'WITHDRAWAL'
                                                        ? 'bg-red-500/10 text-red-600'
                                                        : tx.transaction_type === 'ESCROW_RELEASE'
                                                            ? 'bg-blue-500/10 text-blue-600'
                                                            : 'bg-[#4b636c]/10 text-[#4b636c]'
                                                    }`}>
                                                    {tx.transaction_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600 dark:text-slate-350 line-clamp-1 max-w-[200px]" title={tx.description}>
                                                {tx.description}
                                            </td>
                                            <td className={`px-6 py-3 font-black text-right ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
                                                {isDebit ? '-' : '+'}{wallet?.currency || 'GHS'} {Math.abs(parseFloat(tx.amount)).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-[#4b636c]">
                                                {parseFloat(tx.balance_before || 0).toFixed(2)} → {parseFloat(tx.balance_after || 0).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tx.status === 'SUCCESS' || tx.status === 'COMPLETED'
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : tx.status === 'PENDING'
                                                        ? 'bg-amber-500/10 text-amber-600'
                                                        : 'bg-red-500/10 text-red-600'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-[#4b636c]">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-[#4b636c] italic text-xs">
                            No transactions posted in ledger.
                        </div>
                    )}
                </div>
            </div>

            {/* Order History */}
            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
                <div className="p-6 border-b border-[#dce3e5] dark:border-[#2d3b41]">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#4b636c] flex items-center gap-2">
                        <DynamicLucideIcon name="shopping_bag" className="text-primary text-base" />
                        Order Registry History ({orders.length})
                    </h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                    {orders.length > 0 ? (
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Asset Title</th>
                                    <th className="px-6 py-4">Total Price</th>
                                    <th className="px-6 py-4">Order Status</th>
                                    <th className="px-6 py-4">Escrow Status</th>
                                    <th className="px-6 py-4">Transaction Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41] text-xs font-bold">
                                {orders.map(order => {
                                    const isBuyer = order.buyer_id === profileState.id;
                                    return (
                                        <tr key={order.id} className="hover:bg-primary/[0.01] transition-colors">
                                            <td className="px-6 py-3 font-mono font-black text-[#111618] dark:text-gray-200">
                                                {order.id.slice(0, 8).toUpperCase()}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isBuyer
                                                    ? 'bg-blue-500/10 text-blue-600'
                                                    : 'bg-green-500/10 text-green-600'
                                                    }`}>
                                                    {isBuyer ? 'BUYER' : 'SELLER'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <p className="font-black text-[#111618] dark:text-gray-200 truncate max-w-[150px]">
                                                    {order.product?.title || 'Unknown Product'}
                                                </p>
                                                <span className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{order.payment_method}</span>
                                            </td>
                                            <td className="px-6 py-3 font-black text-primary">
                                                {order.currency || 'GHS'} {parseFloat(order.total_amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${order.status === 'Delivered' || order.status === 'Completed'
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : order.status === 'Cancelled' || order.status === 'Refunded'
                                                        ? 'bg-red-500/10 text-red-600'
                                                        : 'bg-amber-500/10 text-amber-600'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${order.escrow_status === 'Released'
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : order.escrow_status === 'Refunded'
                                                        ? 'bg-red-500/10 text-red-600'
                                                        : 'bg-amber-500/10 text-amber-600'
                                                    }`}>
                                                    {order.escrow_status || 'Held'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-[#4b636c]">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-[#4b636c] italic text-xs">
                            No registered orders in database history.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
