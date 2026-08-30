'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';
import { timeAgo } from '../../../utils/dateUtils';
import LoadingScreen from '@/components/LoadingScreen';
import FollowButton from '@/components/FollowButton';
import FollowersListModal from '@/components/FollowersListModal';
import { formatPrice } from '@/utils/formatters';
import { formatPhoneDisplay, getWhatsAppUrl } from '@/utils/phoneUtils';

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
    const [followersCount, setFollowersCount] = useState(0);
    const [showFollowersModal, setShowFollowersModal] = useState(false);

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

                // Fetch followers count
                const { count: followsCount, error: followsError } = await supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', id);

                if (!followsError && followsCount !== null) {
                    setFollowersCount(followsCount);
                }

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
        return <LoadingScreen message="Loading profile..." fullScreen={false} />;
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#242428] flex items-center justify-center">
                <div className="text-slate-900 dark:text-white font-bold">Seller profile not found.</div>
            </div>
        );
    }


    return (
        <div className="bg-white dark:bg-[#242428] text-slate-900 dark:text-slate-100 min-h-screen font-display">
            <main className="max-w-lg mx-auto pb-4 md:pb-8">
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
                                <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-4 border-white dark:border-[#242428] flex items-center justify-center shadow-lg">
                                    <DynamicLucideIcon name="verified" style={{ fontVariationSettings: "'FILL' 1" }} className="text-[16px] font-bold" />
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-center flex flex-col items-center">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {profile.username || profile.display_name || 'Anonymous'}
                            </h2>
                            {/* Rating Badge */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-bold shadow-sm">
                                <DynamicLucideIcon name="star" style={{ fontVariationSettings: "'FILL' 1" }} className="text-sm text-amber-500" />
                                <span>{parseFloat(profile.average_rating || 0).toFixed(1)}</span>
                                <span className="text-amber-600/80 dark:text-amber-400/80 font-medium">({profile.total_reviews || 0} reviews)</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Reputation Metrics */}
                <section className="px-4 py-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-center shadow-sm">
                            <p className="text-xl font-bold">{activeListings.length}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Listings</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFollowersModal(true)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-center shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                        >
                            <p className="text-xl font-bold text-primary">{followersCount}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Followers</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('reviews')}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-center shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                        >
                            <p className="text-xl font-bold">{profile.total_reviews || 0}</p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Reviews</p>
                        </button>
                    </div>
                </section>

                {/* Profile Actions: Message & Follow */}
                <section className="px-4 pb-2">
                    <div className="flex gap-3">
                        <button
                            onClick={handleContactSeller}
                            disabled={loadingChat}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-[#159ac6] text-white py-3.5 px-5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <DynamicLucideIcon name="chat_bubble" className="text-lg" />
                            {loadingChat ? 'Connecting...' : `Message ${profile.username || (profile.display_name?.split(' ')[0] || 'Seller')}`}
                        </button>
                        <FollowButton
                            targetUserId={id}
                            onFollowChange={(data) => setFollowersCount(data.followerCount)}
                        />
                    </div>
                </section>

                {/* Contact Information Section - Premium Redesign */}
                {(profile.phone || profile.instagram || profile.snapchat) && (
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
                                        <DynamicLucideIcon name="contact_page" className="font-bold text-2xl" />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {profile.phone && (
                                        <div className="relative group/btn-container">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-25 group-hover/btn-container:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                            <a
                                                href={getWhatsAppUrl(profile.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative flex items-center gap-4 p-4 sm:p-5 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white shadow-xl active:scale-[0.98] transition-all duration-300 group/btn overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                                                <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
                                                    <img src="/icons/whatsapp.png" alt="WhatsApp" className="size-8 object-contain shrink-0" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-wider opacity-90">Send WhatsApp Message</p>
                                                    <p className="text-lg font-black tracking-tight truncate">{formatPhoneDisplay(profile.phone)}</p>
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
                                                className="flex flex-col gap-3 p-4 rounded-3xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-2 active:scale-95 transition-all duration-500 min-w-0"
                                            >
                                                <div className="size-12 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/10 shrink-0">
                                                    <img src="/icons/instagram.png" alt="Instagram" className="size-10 object-contain shrink-0" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">@{profile.instagram.replace('@', '')}</p>
                                                </div>
                                            </a>
                                        )}
                                        {profile.snapchat && (
                                            <a
                                                href={`https://snapchat.com/add/${profile.snapchat.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col gap-3 p-4 rounded-3xl bg-white/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl hover:-translate-y-2 active:scale-95 transition-all duration-500 min-w-0"
                                            >
                                                <div className="size-12 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/10 shrink-0">
                                                    <img src="/icons/snapchat.png" alt="Snapchat" className="size-10 object-contain shrink-0" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapchat</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">@{profile.snapchat.replace('@', '')}</p>
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
                                                ₵ {formatPrice(p.price)}
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
                                                    <DynamicLucideIcon name="star" className="text-sm text-yellow-500 filled" />
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
                                                                                    <DynamicLucideIcon name={tagIcons[tag]} className="text-[14px] text-primary" />
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
                                        <DynamicLucideIcon name="rate_review" className="text-3xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No reviews yet</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                        This seller hasn&apos;t received any reviews from buyers yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>

            <FollowersListModal
                isOpen={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                userId={id}
                type="followers"
                title={`${profile.username || profile.display_name || 'Seller'}'s Followers`}
            />
        </div>
    );
}
