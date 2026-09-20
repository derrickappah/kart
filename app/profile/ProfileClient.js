'use client';
import { useState } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import { timeAgo } from '../../utils/dateUtils';
import FollowersListModal from '@/components/FollowersListModal';
import { getAvatarUrl } from '@/utils/avatar';

export default function ProfileClient({ initialData }) {
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'followers' });

    if (!initialData) return null;

    const { user, profile, wallet, stats } = initialData;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-[#111618] dark:text-gray-100 min-h-screen pb-4 md:pb-8 overflow-x-hidden profile-page">
            <main className="max-w-md mx-auto flex flex-col gap-5 px-4 pt-6">
                {/* Profile Header Section */}
                <section className="flex items-center gap-4 animate-fade-in">
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-full p-0.5 border-2 border-dashed border-[#1daddd]/30">
                            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden bg-cover bg-center shadow-sm"
                                style={{ backgroundImage: `url('${getAvatarUrl(profile, user?.id)}')` }}>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-[#111618] dark:text-white truncate">{displayName}</h1>
                        <div className="flex items-center gap-1.5 text-xs text-[#5e7d87] dark:text-gray-400 font-medium whitespace-nowrap">
                            <span>Joined {timeAgo(user?.created_at)}</span>
                            <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-[#111618] dark:text-white">
                                <DynamicLucideIcon name="star" size={13} fill="currentColor" className="text-amber-400" />
                                <span>{parseFloat(stats.reviews || 0) > 0 ? parseFloat(stats.reviews).toFixed(1) : 'New'}</span>
                            </span>
                        </div>
                    </div>
                    <Link href="/profile/edit" className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] hover:bg-[#1daddd] hover:text-white transition-colors duration-300 shrink-0">
                        <DynamicLucideIcon name="edit" size={18} />
                    </Link>
                </section>

                {/* Stats Section */}
                <section className="flex items-center justify-around py-3 border-y border-gray-100 dark:border-gray-800/80">
                    <Link
                        href="/dashboard/seller/listings"
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{stats.listings}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Listings</span>
                    </Link>
                    <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
                    <button
                        type="button"
                        onClick={() => setModalConfig({ isOpen: true, type: 'followers' })}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{stats.followers}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Followers</span>
                    </button>
                    <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
                    <button
                        type="button"
                        onClick={() => setModalConfig({ isOpen: true, type: 'following' })}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{stats.following}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Following</span>
                    </button>
                </section>

                {/* Menu List Section */}
                <section className="flex flex-col space-y-1">
                    <Link href="/dashboard/seller/listings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <DynamicLucideIcon name="storefront" />
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">My Listings</span>
                        <DynamicLucideIcon name="chevron_right" className="text-gray-400 text-xl" />
                    </Link>
                    <Link href="/dashboard/orders" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <DynamicLucideIcon name="shopping_bag" />
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Purchased Items</span>
                        <DynamicLucideIcon name="chevron_right" className="text-gray-400 text-xl" />
                    </Link>
                    <Link href="/dashboard/wishlist" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <DynamicLucideIcon name="bookmark" />
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Saved Items</span>
                        <DynamicLucideIcon name="chevron_right" className="text-gray-400 text-xl" />
                    </Link>
                    <Link href="/dashboard/wallet" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <DynamicLucideIcon name="account_balance_wallet" />
                        </div>
                        <div className="flex-1 flex flex-col text-left">
                            <span className="text-base font-semibold text-[#111618] dark:text-white">KART Wallet</span>
                            <span className="text-xs font-bold text-[#1daddd]">₵ {wallet?.balance ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</span>
                        </div>
                        <DynamicLucideIcon name="chevron_right" className="text-gray-400 text-xl" />
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <DynamicLucideIcon name="settings" />
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Account Settings</span>
                        <DynamicLucideIcon name="chevron_right" className="text-gray-400 text-xl" />
                    </Link>
                </section>

                <section className="mt-2 pb-6">
                    <Link href="/dashboard/seller" className="w-full relative overflow-hidden rounded-xl h-14 bg-[#1daddd] text-white text-base font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#1daddd]/20 flex items-center justify-center gap-2">
                        <DynamicLucideIcon name="store" />
                        <span>Switch to Seller Dashboard</span>
                    </Link>
                </section>
            </main>

            <FollowersListModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                userId={user?.id}
                type={modalConfig.type}
                title={modalConfig.type === 'followers' ? 'My Followers' : 'Following'}
            />
        </div>
    );
}
