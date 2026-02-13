'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import { signout } from '../auth/actions';

export default function ProfilePage() {
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState({ listings: 12, followers: 145, reviews: 4.8 });


    useEffect(() => {
        const fetchProfileData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }
            setUser(user);

            // Fetch profile data
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            setProfile(profileData);

            // Fetch listings count
            const { count: listingsCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('seller_id', user.id);

            setStats(prev => ({ ...prev, listings: listingsCount || 12 }));

            // Fetch wallet balance
            const { data: walletData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .maybeSingle();
            setWallet(walletData);

        };

        fetchProfileData();
    }, [supabase]);



    const displayName = profile?.display_name || 'Alex Johnson';
    const university = profile?.university || "Stanford University • Class of '25";

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#111618] dark:text-gray-100 min-h-screen pb-24 overflow-x-hidden profile-page">
            <main className="max-w-md mx-auto flex flex-col gap-8 px-4 pt-6">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center animate-fade-in">
                    <div className="relative group cursor-pointer">
                        {/* Profile Image */}
                        <div className="w-32 h-32 rounded-full p-1 border-2 border-dashed border-[#1daddd]/30 group-hover:border-[#1daddd] transition-colors duration-300">
                            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden bg-cover bg-center shadow-sm"
                                style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCw2lhXuAw9JUwW8ISP2dXOqUvlpah2n7pQIdoK9DADfxJN35II58VGYtBvbXzU3bTLUPtX5n2mWUwEcI93apzULB8nTkVf01mzFxW-_TpFMEbUyKBRdqXJ2Gejmv16KsMNEqdpPtZJysu1SPu6d0mEl59JBin5nmrXLnZveAuJfrfgMMg4O7dFYfJ50CnVu1l2gytefNQeOLk7uWun4GeWGJyb6kBPedKG7i5m7QBr0KaF1s0n08rIP5dpEIosjpLIKB-6OmkhQQRJ')" }}>
                            </div>
                        </div>
                        {/* Edit Overlay Badge */}
                        <Link href="/profile/edit" className="absolute bottom-1 right-1 bg-[#1daddd] text-white rounded-full p-2 shadow-lg ring-4 ring-[#f6f7f8] dark:ring-[#111d21] flex items-center justify-center hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                    </div>
                    <div className="mt-4 text-center space-y-1">
                        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#111618] dark:text-white">
                            {displayName}
                        </h1>
                        <p className="text-[#5e7d87] dark:text-gray-400 text-base font-medium">
                            {university}
                        </p>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="grid grid-cols-3 gap-3">
                    {/* Stat 1 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#232628] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
                        <p className="text-2xl font-bold text-[#111618] dark:text-white">{stats.listings}</p>
                        <p className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Listings</p>
                    </div>
                    {/* Stat 2 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#232628] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
                        <p className="text-2xl font-bold text-[#111618] dark:text-white">{stats.followers}</p>
                        <p className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Followers</p>
                    </div>
                    {/* Stat 3 */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#232628] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
                        <div className="flex items-center gap-1">
                            <p className="text-2xl font-bold text-[#111618] dark:text-white">{stats.reviews}</p>
                            <span className="material-symbols-outlined filled text-yellow-500 text-lg">star</span>
                        </div>
                        <p className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Reviews</p>
                    </div>
                </section>

                {/* Menu List Section */}
                <section className="flex flex-col space-y-1">
                    {/* My Listings */}
                    <Link href="/dashboard/seller/listings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">My Listings</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* Purchased Items */}
                    <Link href="/dashboard/orders" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">shopping_bag</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Purchased Items</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* Saved Items */}
                    <Link href="/dashboard/wishlist" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">bookmark</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Saved Items</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* KART Wallet */}
                    <Link href="/dashboard/wallet" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                        <div className="flex-1 flex flex-col text-left">
                            <span className="text-base font-semibold text-[#111618] dark:text-white">KART Wallet</span>
                            <span className="text-xs font-bold text-[#1daddd]">GHS {wallet?.balance ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</span>
                        </div>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* Account Settings */}
                    <Link href="/dashboard/settings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">settings</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Account Settings</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* Contact Support (WhatsApp) */}
                    <Link href="https://wa.me/233256650926" target="_blank" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">chat</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Contact Support (WhatsApp)</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    {/* Email Support */}
                    <Link href="mailto:kartzendo@gmail.com" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">mail</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Email Support</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>
                </section>

                {/* Action Button */}
                <section className="mt-2 pb-6">
                    <Link href="/dashboard/seller" className="w-full relative overflow-hidden rounded-xl h-14 bg-[#1daddd] text-white text-base font-bold leading-normal tracking-[0.015em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#1daddd]/20 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">store</span>
                        <span>Switch to Seller Dashboard</span>
                        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </Link>
                </section>
            </main>

            {/* Bottom Navigation Bar (iOS Style) */}
            <nav className="fixed bottom-0 w-full bg-[#f6f7f8] dark:bg-[#111d21] border-t border-gray-100 dark:border-gray-800 pb-safe pt-2 z-50">
                <div className="max-w-md mx-auto flex justify-around items-end h-[60px] pb-3">
                    <Link href="/" className="flex flex-col items-center gap-1 w-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-[28px]">home</span>
                        <span className="text-[10px] font-medium">Home</span>
                    </Link>
                    <Link href="/marketplace" className="flex flex-col items-center gap-1 w-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-[28px]">search</span>
                        <span className="text-[10px] font-medium">Search</span>
                    </Link>
                    <Link href="/dashboard/seller/create" className="flex flex-col items-center justify-center w-full relative -top-5">
                        <div className="size-14 bg-[#1daddd] rounded-full shadow-lg shadow-[#1daddd]/30 flex items-center justify-center text-white hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[32px]">add</span>
                        </div>
                    </Link>
                    <Link href="/dashboard/messages" className="flex flex-col items-center gap-1 w-full text-gray-400 hover:text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined text-[28px]">chat</span>
                        <span className="text-[10px] font-medium">Chat</span>
                    </Link>
                    <Link href="/profile" className="flex flex-col items-center gap-1 w-full text-[#1daddd] transition-colors">
                        <span className="material-symbols-outlined filled text-[28px]">person</span>
                        <span className="text-[10px] font-bold">Profile</span>
                    </Link>
                </div>
            </nav>

            {/* Safe area spacing for mobile */}
            <div className="h-6"></div>
        </div>
    );
}
