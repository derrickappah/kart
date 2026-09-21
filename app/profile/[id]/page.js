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
import { getAvatarUrl } from '@/utils/avatar';

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
    const [reviewedProducts, setReviewedProducts] = useState({});
    const [showContact, setShowContact] = useState(false);
    const [loadingChat, setLoadingChat] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [showFollowersModal, setShowFollowersModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

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
                // Fetch current authenticated user
                const { data: { user } } = await supabase.auth.getUser();
                if (user) setCurrentUser(user);

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

                // Fetch reviewers profiles and reviewed products
                if (reviewsData && reviewsData.length > 0) {
                    const buyerIds = [...new Set(reviewsData.map(r => r.buyer_id).filter(Boolean))];
                    if (buyerIds.length > 0) {
                        const { data: buyersData } = await supabase
                            .from('profiles')
                            .select('id, display_name, username, avatar_url, is_verified')
                            .in('id', buyerIds);

                        if (buyersData) {
                            const buyersMap = buyersData.reduce((acc, buyer) => {
                                acc[buyer.id] = buyer;
                                return acc;
                            }, {});
                            setReviewers(buyersMap);
                        }
                    }

                    const productIds = [...new Set(reviewsData.map(r => r.product_id).filter(Boolean))];
                    if (productIds.length > 0) {
                        const { data: productsData } = await supabase
                            .from('products')
                            .select('id, title, price, images, image_url')
                            .in('id', productIds);

                        if (productsData) {
                            const productsMap = productsData.reduce((acc, prod) => {
                                acc[prod.id] = prod;
                                return acc;
                            }, {});
                            setReviewedProducts(productsMap);
                        }
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
            <main className="max-w-lg mx-auto pb-4 md:pb-8 flex flex-col gap-4 pt-6">
                {/* Profile Header Section */}
                <section className="flex items-center gap-4 px-4 animate-fade-in">
                    <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-full p-0.5 border-2 border-dashed border-[#1daddd]/30">
                            <img
                                alt={profile.display_name || 'Profile'}
                                className="w-full h-full rounded-full object-cover shadow-sm bg-gray-100 dark:bg-gray-800"
                                src={getAvatarUrl(profile)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-xl font-bold leading-tight tracking-tight text-[#111618] dark:text-white truncate">
                                {profile.display_name || profile.username || 'Anonymous'}
                            </h1>
                            {profile.is_verified && (
                                <DynamicLucideIcon name="verified" size={18} className="text-primary shrink-0" />
                            )}
                        </div>
                        {profile.username && profile.display_name && profile.username !== profile.display_name && (
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                @{profile.username}
                            </p>
                        )}
                        <p className="text-xs text-[#5e7d87] dark:text-gray-400 font-medium">
                            {profile.campus ? `${profile.campus} • ` : ''}Joined {timeAgo(profile.created_at)}
                        </p>
                        {profile.bio && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 pt-0.5">
                                {profile.bio}
                            </p>
                        )}
                    </div>
                    {currentUser?.id === id && (
                        <Link
                            href="/profile/edit"
                            className="flex items-center justify-center size-10 rounded-full bg-[#1daddd]/10 text-[#1daddd] hover:bg-[#1daddd] hover:text-white transition-colors duration-300 shrink-0"
                        >
                            <DynamicLucideIcon name="edit" size={18} />
                        </Link>
                    )}
                </section>

                {/* Stats Section (Not cards) */}
                <section className="flex items-center justify-around py-3 mx-4 border-y border-gray-100 dark:border-gray-800/80">
                    <button
                        type="button"
                        onClick={() => setActiveTab('listings')}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{activeListings.length}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Listings</span>
                    </button>
                    <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
                    <button
                        type="button"
                        onClick={() => setShowFollowersModal(true)}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{followersCount}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Followers</span>
                    </button>
                    <span className="text-gray-300 dark:text-gray-700 select-none">•</span>
                    <button
                        type="button"
                        onClick={() => setActiveTab('reviews')}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <span className="text-base font-bold text-[#111618] dark:text-white">{profile.total_reviews || 0}</span>
                        <span className="text-sm text-[#5e7d87] dark:text-gray-400 font-medium">Reviews</span>
                    </button>
                </section>

                {/* Profile Actions: Message & Follow (Only for other users) */}
                {currentUser?.id !== id && (
                    <section className="px-4 pb-1">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleContactSeller}
                                disabled={loadingChat}
                                className="h-11 w-full flex items-center justify-center gap-2 bg-[#1daddd] hover:bg-[#159ac6] active:scale-[0.98] text-white rounded-xl font-semibold text-sm shadow-sm shadow-[#1daddd]/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                            >
                                {loadingChat ? (
                                    <>
                                        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <DynamicLucideIcon name="chat_bubble" size={17} />
                                        <span>Message</span>
                                    </>
                                )}
                            </button>
                            <FollowButton
                                targetUserId={id}
                                onFollowChange={(data) => setFollowersCount(data.followerCount)}
                                className="w-full h-11"
                            />
                        </div>
                    </section>
                )}

                {/* Contact Information Section - Clean Redesign */}
                {(profile.phone || profile.instagram || profile.snapchat) && (
                    <section className="px-4">
                        <div className="bg-white dark:bg-[#1c2b30] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                        <DynamicLucideIcon name="contact_page" size={16} />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Contact & Socials
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 uppercase tracking-wider">
                                    Verified
                                </span>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                {profile.phone && (
                                    <a
                                        href={getWhatsAppUrl(profile.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-9 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-xs shrink-0">
                                                <img src="/icons/whatsapp.png" alt="WhatsApp" className="size-5 object-contain brightness-0 invert" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                                                    WhatsApp
                                                </p>
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate">
                                                    {formatPhoneDisplay(profile.phone)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shrink-0">
                                            <span>Chat</span>
                                            <DynamicLucideIcon name="chevron_right" size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </a>
                                )}

                                {(profile.instagram || profile.snapchat) && (
                                    <div className={`grid ${profile.instagram && profile.snapchat ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
                                        {profile.instagram && (
                                            <a
                                                href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 dark:bg-[#162226] dark:hover:bg-[#243438] border border-gray-200/70 dark:border-gray-700/60 transition-colors group cursor-pointer min-w-0"
                                            >
                                                <div className="size-8 rounded-lg flex items-center justify-center shrink-0">
                                                    <img src="/icons/instagram.png" alt="Instagram" className="size-6 object-contain" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Instagram</p>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">@{profile.instagram.replace('@', '')}</p>
                                                </div>
                                                <DynamicLucideIcon name="open_in_new" size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                                            </a>
                                        )}

                                        {profile.snapchat && (
                                            <a
                                                href={`https://snapchat.com/add/${profile.snapchat.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/80 dark:bg-[#162226] dark:hover:bg-[#243438] border border-gray-200/70 dark:border-gray-700/60 transition-colors group cursor-pointer min-w-0"
                                            >
                                                <div className="size-8 rounded-lg flex items-center justify-center shrink-0">
                                                    <img src="/icons/snapchat.png" alt="Snapchat" className="size-6 object-contain" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Snapchat</p>
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">@{profile.snapchat.replace('@', '')}</p>
                                                </div>
                                                <DynamicLucideIcon name="open_in_new" size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                                            </a>
                                        )}
                                    </div>
                                )}
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
                                    const reviewedProduct = review.product_id ? reviewedProducts[review.product_id] : null;
                                    return (
                                        <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                                        <img src={getAvatarUrl(reviewer)} alt={reviewer.display_name || reviewer.username || 'User'} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {reviewer.display_name || reviewer.username || 'Anonymous User'}
                                                            </p>
                                                            {reviewer.is_verified && (
                                                                <DynamicLucideIcon name="verified" size={14} className="text-primary shrink-0" />
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {timeAgo(review.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg shrink-0">
                                                    <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">{review.rating}</span>
                                                    <DynamicLucideIcon name="star" style={{ fontVariationSettings: "'FILL' 1" }} className="text-sm text-yellow-500" />
                                                </div>
                                            </div>

                                            {/* Reviewed Product Link */}
                                            {reviewedProduct && (
                                                <Link
                                                    href={`/marketplace/${reviewedProduct.id}`}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 transition-all group/prod"
                                                >
                                                    <div className="size-11 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                                        {(reviewedProduct.images?.[0] || reviewedProduct.image_url) ? (
                                                            <img
                                                                src={reviewedProduct.images?.[0] || reviewedProduct.image_url}
                                                                alt={reviewedProduct.title}
                                                                className="w-full h-full object-cover group-hover/prod:scale-105 transition-transform"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <DynamicLucideIcon name="package" className="text-lg" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Item Reviewed</p>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover/prod:text-primary transition-colors">
                                                            {reviewedProduct.title}
                                                        </p>
                                                    </div>
                                                    {reviewedProduct.price !== undefined && reviewedProduct.price !== null && (
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                            ₵ {formatPrice(reviewedProduct.price)}
                                                        </span>
                                                    )}
                                                    <DynamicLucideIcon name="chevron_right" className="text-slate-400 text-sm shrink-0 group-hover/prod:translate-x-0.5 transition-transform" />
                                                </Link>
                                            )}

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
