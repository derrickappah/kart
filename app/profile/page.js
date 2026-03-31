'use client';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import { timeAgo } from '../../utils/dateUtils';

const supabase = createClient();

const profileFetcher = async () => {
    let { data: { user: authUser } } = await supabase.auth.getUser();
    
    // If no user, wait a tiny bit and try getSession (sometimes faster during initial load)
    if (!authUser) {
        const { data: { session } } = await supabase.auth.getSession();
        authUser = session?.user || null;
    }

    if (!authUser) return null;

    const [profileRes, listingsRes, walletRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', authUser.id),
        supabase.from('wallets').select('balance').eq('user_id', authUser.id).maybeSingle(),
        supabase.from('platform_settings').select('value').eq('key', 'whatsapp_support_number').maybeSingle(),
    ]);

    let whatsappSupportNumber = '0500502158';
    try {
        if (settingsRes.data?.value) {
            whatsappSupportNumber = JSON.parse(settingsRes.data.value);
        }
    } catch (e) {
        console.error('Failed to parse whatsapp support number', e);
    }

    return {
        user: authUser,
        profile: profileRes.data,
        wallet: walletRes.data,
        whatsappSupportNumber,
        stats: {
            listings: listingsRes.count || 0,
            reviews: profileRes.data?.average_rating || 0,
        },
    };
};

export default function ProfilePage() {
    const router = useRouter();
    const { data, error, isLoading } = useSWR('profile-data', profileFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="bg-[#f6f7f8] dark:bg-[#111d21] min-h-screen pb-24 animate-pulse">
                <div className="max-w-md mx-auto flex flex-col gap-8 px-4 pt-6">
                    {/* Avatar + name */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="size-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-white dark:bg-[#232628] rounded-2xl" />
                        <div className="h-20 bg-white dark:bg-[#232628] rounded-2xl" />
                    </div>
                    {/* Menu rows */}
                    <div className="flex flex-col gap-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-white dark:bg-[#232628] rounded-xl" />
                        ))}
                    </div>
                    {/* CTA button */}
                    <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                </div>
            </div>
        );
    }

    if (data === null) {
        router.push('/login');
        return null;
    }

    if (error) {
        return (
            <div className="bg-[#f6f7f8] dark:bg-[#111d21] min-h-screen flex items-center justify-center p-4">
                <p className="text-red-500 font-medium">Failed to load profile. Please refresh the page.</p>
            </div>
        );
    }

    if (!data) return null;

    const { user, profile, wallet, stats } = data;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
    const university = profile?.university || profile?.campus || "University Student";

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#111618] dark:text-gray-100 min-h-screen pb-24 overflow-x-hidden profile-page">
            <main className="max-w-md mx-auto flex flex-col gap-8 px-4 pt-6">
                {/* Profile Header Section */}
                <section className="flex flex-col items-center animate-fade-in text-center">
                    <div className="relative group cursor-pointer">
                        <div className="w-32 h-32 rounded-full p-1 border-2 border-dashed border-[#1daddd]/30 group-hover:border-[#1daddd] transition-colors duration-300">
                            <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden bg-cover bg-center shadow-sm"
                                style={{ backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : "url('https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y')" }}>
                            </div>
                        </div>
                        <Link href="/profile/edit" className="absolute bottom-1 right-1 bg-[#1daddd] text-white rounded-full p-2 shadow-lg ring-4 ring-[#f6f7f8] dark:ring-[#111d21] flex items-center justify-center hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                    </div>
                    <div className="mt-4 space-y-1">
                        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#111618] dark:text-white">{displayName}</h1>
                        <p className="text-[#5e7d87] dark:text-gray-400 text-sm font-medium">
                            {university} • Joined {timeAgo(user?.created_at)}
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
                    <Link href="/dashboard/wallet" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] group-hover:bg-[#1daddd] group-hover:text-white transition-colors duration-300">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                        <div className="flex-1 flex flex-col text-left">
                            <span className="text-base font-semibold text-[#111618] dark:text-white">KART Wallet</span>
                            <span className="text-xs font-bold text-[#1daddd]">₵ {wallet?.balance ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</span>
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
                    <Link href={`https://wa.me/${data.whatsappSupportNumber.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#232628] hover:bg-gray-50 dark:hover:bg-[#232628]/80 active:scale-[0.99] transition-all group border border-gray-100 dark:border-gray-800 shadow-sm">
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
                    <Link href="/dashboard/seller" className="w-full relative overflow-hidden rounded-xl h-14 bg-[#1daddd] text-white text-base font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#1daddd]/20 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">store</span>
                        <span>Switch to Seller Dashboard</span>
                    </Link>
                </section>
            </main>
        </div>
    );
}
