'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function SellerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [activeListings, setActiveListings] = useState([]);
    const [activeTab, setActiveTab] = useState('listings'); // 'listings' or 'reviews'
    const [loadingChat, setLoadingChat] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Fetch profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);

                // Fetch active listings
                const { data: listingsData, error: listingsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('seller_id', id)
                    .eq('status', 'Active')
                    .order('created_at', { ascending: false });

                if (listingsError) throw listingsError;
                setActiveListings(listingsData);

            } catch (err) {
                console.error('Error fetching seller profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [id, supabase]);

    const handleContactSeller = async () => {
        setLoadingChat(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        if (user.id === id) {
            alert("You cannot message yourself!");
            setLoadingChat(false);
            return;
        }

        try {
            const { data: myConvs } = await supabase
                .from('conversations')
                .select('*')
                .contains('participants', [user.id]);

            const existingConv = myConvs?.find(c => c.participants.includes(id));

            if (existingConv) {
                router.push(`/dashboard/messages/${existingConv.id}`);
            } else {
                const { data: newConv, error } = await supabase
                    .from('conversations')
                    .insert([{
                        participants: [user.id, id]
                    }])
                    .select()
                    .single();

                if (error) throw error;
                router.push(`/dashboard/messages/${newConv.id}`);
            }
        } catch (error) {
            console.error("Error starting chat:", error);
            alert("Could not start chat. Please try again.");
            setLoadingChat(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#111d21] flex items-center justify-center">
                <div className="animate-pulse text-primary font-bold">Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#111d21] flex items-center justify-center">
                <div className="text-slate-900 dark:text-white font-bold">Seller profile not found.</div>
            </div>
        );
    }

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] text-slate-900 dark:text-slate-100 min-h-screen font-display">
            <main className="max-w-lg mx-auto pb-24">
                {/* Profile Header Section */}
                <section className="px-4 pt-6 pb-2">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="size-28 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                                {profile.avatar_url ? (
                                    <img alt={profile.display_name} className="w-full h-full object-cover" src={profile.avatar_url} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-3xl font-bold">
                                        {profile.display_name?.[0].toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            {profile.is_verified && (
                                <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-4 border-[#f6f7f8] dark:border-[#111d21] flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-[16px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-center">
                            <h2 className="text-2xl font-bold tracking-tight">{profile.display_name || 'Anonymous'}</h2>
                            <div className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1">
                                <span className="material-symbols-outlined text-sm">school</span>
                                <p className="text-sm font-medium">{profile.campus || 'University Campus'}</p>
                            </div>
                            {profile.is_verified && (
                                <div className="inline-flex items-center mt-3 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    <span className="text-xs font-bold uppercase tracking-wider">Verified Student Badge</span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Reputation Metrics */}
                <section className="px-4 py-4">
                    <div className="flex gap-3">
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-sm">
                            <div className="flex items-center justify-center gap-1 text-primary">
                                <p className="text-2xl font-bold">{parseFloat(profile.average_rating || 0).toFixed(1)}</p>
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Rating</p>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-sm">
                            <p className="text-2xl font-bold">{profile.total_reviews || 0}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Reviews</p>
                        </div>
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-center shadow-sm">
                            <p className="text-2xl font-bold">{activeListings.length}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Active</p>
                        </div>
                    </div>
                </section>

                {/* Tabs Navigation */}
                <section className="mt-4">
                    <div className="flex border-b border-slate-200 dark:border-slate-800 px-4">
                        <button 
                            onClick={() => setActiveTab('listings')}
                            className={`flex-1 flex flex-col items-center justify-center pt-4 pb-3 border-b-2 transition-colors ${activeTab === 'listings' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
                        >
                            <span className="text-sm font-bold">Active Listings</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('reviews')}
                            className={`flex-1 flex flex-col items-center justify-center pt-4 pb-3 border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-primary text-slate-900 dark:text-white' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
                        >
                            <span className="text-sm font-bold">Reviews</span>
                        </button>
                    </div>
                </section>

                {/* Content based on Active Tab */}
                <section className="p-4">
                    {activeTab === 'listings' ? (
                        <div className="grid grid-cols-2 gap-4">
                            {activeListings.length > 0 ? (
                                activeListings.map((p) => (
                                    <Link href={`/marketplace/${p.id}`} key={p.id} className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                        <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                                            <img alt={p.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" src={p.images?.[0] || p.image_url} />
                                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-900/80 text-white text-sm font-bold rounded-lg backdrop-blur-md">
                                                GHS {p.price}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-sm font-semibold line-clamp-1">{p.title}</h3>
                                            <p className="text-[11px] text-slate-500 mt-1 font-medium">{p.condition} • {timeAgo(p.created_at)}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 text-slate-500">
                                    No active listings found.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            Reviews functionality coming soon.
                        </div>
                    )}
                </section>
            </main>

            {/* Fixed Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#f6f7f8] dark:from-[#111d21] via-[#f6f7f8]/95 dark:via-[#111d21]/95 to-transparent">
                <div className="max-w-lg mx-auto flex gap-3">
                    <button 
                        onClick={handleContactSeller}
                        disabled={loadingChat}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/25 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">chat_bubble</span>
                        {loadingChat ? '...' : `Message ${profile.display_name?.split(' ')[0] || 'Seller'}`}
                    </button>
                    <button className="flex size-14 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm active:scale-95 transition-transform">
                        <span className="material-symbols-outlined">person_add</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
