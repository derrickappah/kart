'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { timeAgo } from '../../../utils/dateUtils';

export default function SellerProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [activeListings, setActiveListings] = useState([]);
    const [activeTab, setActiveTab] = useState('listings'); // 'listings' or 'reviews'
    const [reviews, setReviews] = useState([]);
    const [reviewers, setReviewers] = useState({});
    const [showContact, setShowContact] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);

    const tagIcons = {
        'Fair Price': 'thumb_up',
        'Punctual': 'schedule',
        'Item as Described': 'check_circle',
        'Friendly': 'sentiment_satisfied',
        'Quick Response': 'bolt'
    };

    const parseReviewContent = (content) => {
        if (!content) return { text: '', tags: [] };
        const tagsMatch = content.match(/\[Tags: (.*?)\]/);
        if (tagsMatch) {
            const tagsString = tagsMatch[1];
            const tags = tagsString.split(',').map(t => t.trim());
            const text = content.replace(tagsMatch[0], '').trim();
            return { text, tags };
        }
        return { text: content, tags: [] };
    };

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

                // Fetch reviews
                const { data: reviewsData, error: reviewsError } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('seller_id', id)
                    .order('created_at', { ascending: false });

                if (reviewsError) throw reviewsError;
                setReviews(reviewsData || []);

                // Fetch reviewers profiles
                if (reviewsData && reviewsData.length > 0) {
                    const buyerIds = [...new Set(reviewsData.map(r => r.buyer_id))];
                    const { data: buyersData } = await supabase
                        .from('profiles')
                        .select('id, display_name, avatar_url')
                        .in('id', buyerIds);

                    if (buyersData) {
                        const buyersMap = buyersData.reduce((acc, buyer) => {
                            acc[buyer.id] = buyer;
                            return acc;
                        }, {});
                        setReviewers(buyersMap);
                    }
                }

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
                            <h2 className="text-2xl font-bold tracking-tight">
                                {profile.username || profile.display_name || 'Anonymous'}
                            </h2>
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

                {/* Contact Information Section - Premium Redesign */}
                {(profile.phone || profile.instagram || profile.linkedin) && (
                    <section className="px-4 py-4">
                        <div className="relative group overflow-hidden rounded-[2.5rem] border border-white/40 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl shadow-2xl p-7 transition-all duration-500 hover:shadow-primary/20">
                            {/* Decorative Background Elements */}
                            <div className="absolute -top-24 -right-24 size-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-1000" />
                            <div className="absolute -bottom-24 -left-24 size-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-1000" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Contact Info</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Seller Socials & Contact</p>
                                        </div>
                                    </div>
                                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-inner">
                                        <span className="material-symbols-outlined font-bold text-2xl">contact_page</span>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {profile.phone && (
                                        <div className="relative group/btn-container">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-25 group-hover/btn-container:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                            <a
                                                href={`https://wa.me/${profile.phone.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative flex items-center gap-5 p-5 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white shadow-xl active:scale-[0.98] transition-all duration-300 group/btn overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                                                <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                                                    <span className="material-symbols-outlined text-3xl font-bold">chat</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black uppercase tracking-wider opacity-90">Send WhatsApp Message</p>
                                                    <p className="text-lg font-black tracking-tight">{profile.phone}</p>
                                                </div>
                                                <div className="size-10 rounded-full bg-white/10 flex items-center justify-center group-hover/btn:bg-white/20 transition-colors">
                                                    <span className="material-symbols-outlined text-xl font-bold group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                                </div>
                                            </a>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {profile.instagram && (
                                            <a
                                                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col gap-3 p-4 rounded-3xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-2 active:scale-95 transition-all duration-500"
                                            >
                                                <div className="size-12 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                                    <svg className="size-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 7.765a4.235 4.235 0 100 8.47 4.235 4.235 0 000-8.47zm0 1.802a2.433 2.433 0 110 4.866 2.433 2.433 0 010-4.866zm5.272-4.331a1.08 1.08 0 11-2.16 0 1.08 1.08 0 012.16 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">@{profile.instagram.replace('@', '')}</p>
                                                </div>
                                            </a>
                                        )}
                                        {profile.linkedin && (
                                            <a
                                                href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col gap-3 p-4 rounded-3xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-2 active:scale-95 transition-all duration-500"
                                            >
                                                <div className="size-12 rounded-2xl bg-[#0077b5] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                    <svg className="size-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">Professional</p>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

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
                        <div className="flex flex-col gap-4">
                            {reviews.length > 0 ? (
                                reviews.map((review) => {
                                    const reviewer = reviewers[review.buyer_id] || {};
                                    return (
                                        <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        {reviewer.avatar_url ? (
                                                            <img src={reviewer.avatar_url} alt={reviewer.display_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                                                {reviewer.display_name?.[0]?.toUpperCase() || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {reviewer.display_name || 'Anonymous User'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {timeAgo(review.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                                                    <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">{review.rating}</span>
                                                    <span className="material-symbols-outlined text-sm text-yellow-500 filled">star</span>
                                                </div>
                                            </div>

                                            {review.comment && (
                                                <div className="pl-1">
                                                    {(() => {
                                                        const { text, tags } = parseReviewContent(review.comment);
                                                        return (
                                                            <div className="flex flex-col gap-3">
                                                                {tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {tags.map((tag, idx) => (
                                                                            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                                {tagIcons[tag] && (
                                                                                    <span className="material-symbols-outlined text-[14px] text-primary">
                                                                                        {tagIcons[tag]}
                                                                                    </span>
                                                                                )}
                                                                                {tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {text && (
                                                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                        {text}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                                    <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                        <span className="material-symbols-outlined text-3xl">rate_review</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No reviews yet</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                        This seller hasn't received any reviews from buyers yet.
                                    </p>
                                </div>
                            )}
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
                        {loadingChat ? '...' : `Message ${profile.username || (profile.display_name?.split(' ')[0] || 'Seller')}`}
                    </button>
                    <button className="flex size-14 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-sm active:scale-95 transition-transform">
                        <span className="material-symbols-outlined">person_add</span>
                    </button>
                </div>
            </div>
        </div >
    );
}
