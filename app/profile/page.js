'use client';
import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState({ listings: 0, followers: 0, reviews: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            setLoading(true);
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                    router.push('/login');
                    return;
                }
                setUser(authUser);

                // Fetch profile, listings, and wallet in parallel
                const [profileRes, listingsRes, walletRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .maybeSingle(),
                    supabase
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('seller_id', authUser.id),
                    supabase
                        .from('wallets')
                        .select('balance')
                        .eq('user_id', authUser.id)
                        .maybeSingle()
                ]);

                if (profileRes.data) {
                    setProfile(profileRes.data);
                }

                if (walletRes.data) {
                    setWallet(walletRes.data);
                }

                setStats({
                    listings: listingsRes.count || 0,
                    followers: profileRes.data?.follower_count || 0,
                    reviews: profileRes.data?.average_rating || 0
                });
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [supabase, router]);

    if (loading) {
        return (
            <div className="bg-[#f6f7f8] dark:bg-[#111d21] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-[#1daddd] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#5e7d87] dark:text-gray-400 font-medium animate-pulse">Loading your profile...</p>
                </div>
            </div>
        );
    }

    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
    const university = profile?.university || profile?.campus || "University Student";

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#111618] dark:text-gray-100 min-h-screen pb-24 overflow-x-hidden profile-page">
            <main className="max-w-md mx-auto flex flex-col gap-8 px-4 pt-6">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center animate-fade-in text-center">
                    <div className="relative group cursor-pointer">
                        {/* Profile Image */}
                        <div className="w-32 h-32 rounded-full p-1 border-2 border-dashed border-[#1daddd]/30 group-hover:border-[#1daddd] transition-colors duration-300">
                            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden bg-cover bg-center shadow-sm"
                                style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : "url('https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y')" }}>
                            </div>
                        </div>
                        {/* Edit Overlay Badge */}
                        <Link href="/profile/edit" className="absolute bottom-1 right-1 bg-[#1daddd] text-white rounded-full p-2 shadow-lg ring-4 ring-[#f6f7f8] dark:ring-[#111d21] flex items-center justify-center hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                    </div>
                    <div className="mt-4 space-y-1">
                        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#111618] dark:text-white">
                            {displayName}
                        </h1>
                        <p className="text-[#5e7d87] dark:text-gray-400 text-base font-medium">
                            {university}
                        </p>
                    </div>
                </section>

                {/* Stats Section */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#232628] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
                        <p className="text-2xl font-bold text-[#111618] dark:text-white">{stats.listings}</p>
                        <p className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Listings</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#232628] border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-default">
                        <div className="flex items-center gap-1">
                            <p className="text-2xl font-bold text-[#111618] dark:text-white">{parseFloat(stats.reviews).toFixed(1)}</p>
                            <span className="material-symbols-outlined filled text-yellow-500 text-lg">star</span>
                        </div>
                        <p className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Reviews</p>
                    </div>
                </section>

                {/* Menu List Section */}
                <section className="flex flex-col space-y-1">
                    <Link href="/dashboard/seller/listings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">My Listings</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    <Link href="/dashboard/orders" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">shopping_bag</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Purchased Items</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

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

                    <Link href="/dashboard/settings" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">settings</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Account Settings</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    <Link href="https://wa.me/233256650926" target="_blank" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">chat</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Contact Support (WhatsApp)</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>

                    <Link href="mailto:kartzendo@gmail.com" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">mail</span>
                        </div>
                        <span className="text-base font-semibold flex-1 text-left text-[#111618] dark:text-white">Email Support</span>
                        <span className="material-symbols-outlined text-gray-400 text-xl">chevron_right</span>
                    </Link>
                </section>

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

            <div className="h-6"></div>
        </div>
    );
}
