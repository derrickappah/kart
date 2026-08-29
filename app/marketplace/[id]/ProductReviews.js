'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/client';
import { timeAgo } from '@/utils/dateUtils';

const MAX_REVIEW_LENGTH = 500;

const TAGS = [
    { icon: 'thumb_up', label: 'Fair Price' },
    { icon: 'schedule', label: 'Punctual' },
    { icon: 'check_circle', label: 'Item as Described' },
    { icon: 'sentiment_satisfied', label: 'Friendly' },
    { icon: 'bolt', label: 'Quick Response' }
];

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Great'];

const TAG_ICONS = {
    'Fair Price': 'thumb_up',
    'Punctual': 'schedule',
    'Item as Described': 'check_circle',
    'Friendly': 'sentiment_satisfied',
    'Quick Response': 'bolt'
};

function parseReviewComment(rawComment) {
    if (!rawComment) return { text: '', tags: [] };
    const match = rawComment.match(/\[Tags:\s*(.*?)\]/);
    if (match) {
        const tagString = match[1];
        const tags = tagString.split(',').map(t => t.trim()).filter(Boolean);
        const text = rawComment.replace(match[0], '').trim();
        return { text, tags };
    }
    return { text: rawComment, tags: [] };
}

export default function ProductReviews({ productId, sellerId, productTitle, isOwner, currentUser: propUser = null }) {
    const router = useRouter();
    const [reviews, setReviews] = useState([]);
    const [reviewers, setReviewers] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(propUser || null);
    const [userReview, setUserReview] = useState(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState([]);
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successFeedback, setSuccessFeedback] = useState(null);

    const supabase = createClient();

    // Sync propUser if passed from parent
    useEffect(() => {
        if (propUser) {
            setCurrentUser(propUser);
        }
    }, [propUser]);

    const fetchReviews = useCallback(async () => {
        try {
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('reviews')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (reviewsError) {
                console.error('Error fetching product reviews:', reviewsError);
                return;
            }

            const list = reviewsData || [];
            setReviews(list);

            if (list.length > 0) {
                const buyerIds = [...new Set(list.map(r => r.buyer_id).filter(Boolean))];
                if (buyerIds.length > 0) {
                    const { data: buyersData, error: buyersError } = await supabase
                        .from('profiles')
                        .select('id, display_name, avatar_url, is_verified, username')
                        .in('id', buyerIds);

                    if (!buyersError && buyersData) {
                        const map = {};
                        buyersData.forEach(buyer => {
                            map[buyer.id] = buyer;
                        });
                        setReviewers(map);
                    }
                }
            }
        } catch (err) {
            console.error('Unexpected error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    }, [productId, supabase]);

    useEffect(() => {
        let active = true;

        const checkAuthAndFetch = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (active && user) {
                    setCurrentUser(user);
                }
            } catch (authErr) {
                console.error('Error fetching auth user in reviews:', authErr);
            }
            await fetchReviews();
        };

        checkAuthAndFetch();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (active) {
                setCurrentUser(session?.user || null);
            }
        });

        return () => {
            active = false;
            subscription?.unsubscribe();
        };
    }, [fetchReviews, supabase]);

    // Check if current user has an existing review
    useEffect(() => {
        if (currentUser && reviews.length > 0) {
            const found = reviews.find(r => r.buyer_id === currentUser.id);
            setUserReview(found || null);
        } else {
            setUserReview(null);
        }
    }, [currentUser, reviews]);

    const openReviewModal = async (existing = null, initialRating = 0) => {
        let user = currentUser;

        // If not in state yet, check with supabase directly before deciding to redirect
        if (!user) {
            try {
                const { data: { user: freshUser } } = await supabase.auth.getUser();
                if (freshUser) {
                    user = freshUser;
                    setCurrentUser(freshUser);
                }
            } catch (err) {
                console.error('Error checking user session in openReviewModal:', err);
            }
        }

        // Only redirect if genuinely unauthenticated
        if (!user) {
            router.push(`/login?next=/marketplace/${productId}`);
            return;
        }

        const toEdit = existing || userReview;
        if (toEdit) {
            setRating(initialRating || toEdit.rating || 0);
            const { text, tags } = parseReviewComment(toEdit.comment);
            setReviewText(text || '');
            setSelectedTags(tags || []);
        } else {
            setRating(initialRating || 0);
            setReviewText('');
            setSelectedTags([]);
        }

        setErrorMessage('');
        setIsModalOpen(true);
    };

    const closeReviewModal = () => {
        if (submitting) return;
        setIsModalOpen(false);
        setErrorMessage('');
    };

    const toggleTag = (label) => {
        if (selectedTags.includes(label)) {
            setSelectedTags(selectedTags.filter(t => t !== label));
        } else {
            setSelectedTags([...selectedTags, label]);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (rating === 0) {
            setErrorMessage('Please select a star rating (1 to 5 stars).');
            return;
        }

        setSubmitting(true);

        try {
            const commentPayload = selectedTags.length > 0
                ? `${reviewText.trim()}\n\n[Tags: ${selectedTags.join(', ')}]`
                : reviewText.trim();

            const response = await fetch('/api/reviews/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId,
                    rating,
                    comment: commentPayload,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit review');
            }

            setSuccessFeedback(userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
            setTimeout(() => setSuccessFeedback(null), 3500);

            setIsModalOpen(false);
            await fetchReviews();
        } catch (err) {
            console.error('Error submitting review:', err);
            setErrorMessage(err.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Rating calculations
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(1)
        : null;

    const distribution = [5, 4, 3, 2, 1].map(stars => {
        const count = reviews.filter(r => r.rating === stars).length;
        const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
        return { stars, count, percentage };
    });

    const parsedUserReview = userReview ? parseReviewComment(userReview.comment) : null;

    return (
        <section id="reviews-section" className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800 scroll-mt-24" aria-labelledby="reviews-heading">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 id="reviews-heading" className="text-xl md:text-2xl font-extrabold text-[#0e181b] dark:text-white flex items-center gap-2.5">
                        <span>Ratings & Reviews</span>
                        {totalReviews > 0 && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Verified student reviews for this listing
                    </p>
                </div>

                {successFeedback && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 text-xs font-bold animate-fade-in self-start sm:self-auto">
                        <DynamicLucideIcon name="check_circle" size={16} className="text-green-600 dark:text-green-400" />
                        <span>{successFeedback}</span>
                    </div>
                )}
            </div>

            {/* Main Interactive Ratings Hub: Dual-Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* Left Card: Score & Rating Distribution (7 Cols) */}
                <div className="lg:col-span-7 bg-white dark:bg-[#2c3136] rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-sm flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-4">
                        Rating Breakdown
                    </h3>
                    
                    {totalReviews > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                            {/* Big Score Block */}
                            <div className="sm:col-span-5 flex flex-col items-center sm:items-start justify-center text-center sm:text-left sm:border-r border-gray-100 dark:border-gray-800 pr-0 sm:pr-4">
                                <div className="text-5xl font-black text-[#0e181b] dark:text-white tracking-tight">
                                    {averageRating}
                                </div>
                                <div className="flex items-center gap-1 my-2.5" aria-label={`Average rating: ${averageRating} out of 5 stars`}>
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const roundedAvg = parseFloat(averageRating || 0);
                                        const isFilled = star <= Math.round(roundedAvg);
                                        return (
                                            <DynamicLucideIcon
                                                key={star}
                                                name="star"
                                                size={20}
                                                fill={isFilled ? 'currentColor' : 'none'}
                                                className={isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                                aria-hidden="true"
                                            />
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    Based on {totalReviews} {totalReviews === 1 ? 'rating' : 'ratings'}
                                </p>
                            </div>

                            {/* Distribution Bars */}
                            <div className="sm:col-span-7 flex flex-col gap-2.5">
                                {distribution.map(({ stars, count, percentage }) => (
                                    <div key={stars} className="flex items-center gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        <span className="w-7 text-right shrink-0 flex items-center justify-end gap-1">
                                            <span>{stars}</span>
                                            <DynamicLucideIcon name="star" size={12} fill="currentColor" className="text-yellow-400" aria-hidden="true" />
                                        </span>
                                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                                role="progressbar"
                                                aria-valuenow={percentage}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                        <span className="w-8 text-right text-gray-400 dark:text-gray-500 font-mono text-[11px] shrink-0">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 flex flex-col items-center justify-center text-center gap-2">
                            <div className="size-12 rounded-full bg-yellow-400/10 text-yellow-500 flex items-center justify-center">
                                <DynamicLucideIcon name="star" size={24} fill="currentColor" />
                            </div>
                            <p className="font-bold text-sm text-[#0e181b] dark:text-white mt-1">No ratings yet</p>
                            <p className="text-xs text-gray-400 max-w-xs">Be the first to rate this listing and share your experience with campus buyers.</p>
                        </div>
                    )}
                </div>

                {/* Right Card: Prominent Review Action Callout (5 Cols) */}
                <div className="lg:col-span-5 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent dark:from-[#2c3136] dark:to-[#22262a] rounded-3xl p-6 border border-primary/20 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    {!isOwner ? (
                        userReview ? (
                            /* User already reviewed: Pinned "Your Review" Card with prominent Edit CTA */
                            <div className="flex flex-col justify-between h-full gap-4">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-white text-[11px] font-bold tracking-wide">
                                            <DynamicLucideIcon name="check" size={12} strokeWidth={3} />
                                            <span>Your Review</span>
                                        </span>
                                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                            {timeAgo(userReview.created_at)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 my-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <DynamicLucideIcon
                                                key={star}
                                                name="star"
                                                size={18}
                                                fill={star <= userReview.rating ? 'currentColor' : 'none'}
                                                className={star <= userReview.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                                aria-hidden="true"
                                            />
                                        ))}
                                        <span className="text-xs font-black ml-1 text-primary">
                                            {userReview.rating}.0 • {RATING_LABELS[userReview.rating - 1]}
                                        </span>
                                    </div>

                                    {parsedUserReview?.text ? (
                                        <p className="text-xs text-[#4f5b66] dark:text-slate-300 line-clamp-2 leading-relaxed mt-2 italic">
                                            &ldquo;{parsedUserReview.text}&rdquo;
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                            Rating submitted without comment.
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openReviewModal(userReview)}
                                    className="w-full h-12 rounded-2xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-primary dark:text-primary-light font-bold text-sm border border-primary/30 dark:border-primary/40 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <DynamicLucideIcon name="edit" size={16} aria-hidden="true" />
                                    <span>Edit Your Review</span>
                                </button>
                            </div>
                        ) : (
                            /* User hasn't reviewed: Engaging Call-To-Action Card */
                            <div className="flex flex-col justify-between h-full gap-4">
                                <div>
                                    <h3 className="text-base font-extrabold text-[#0e181b] dark:text-white">
                                        Review this listing
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                        Have you interacted with this seller or checked out this item? Share your feedback.
                                    </p>

                                    {/* Interactive 5-star quick launch row */}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-primary/10 dark:border-gray-700/50">
                                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tap to rate:</span>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => openReviewModal(null, star)}
                                                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                                    className="p-1 hover:scale-125 transition-transform text-gray-300 dark:text-gray-600 hover:text-yellow-400 focus:outline-none"
                                                >
                                                    <DynamicLucideIcon name="star" size={20} fill="currentColor" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openReviewModal(null)}
                                    className="w-full h-12 rounded-2xl bg-primary hover:bg-[#0b5f76] text-white font-bold text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    <DynamicLucideIcon name="rate_review" size={18} aria-hidden="true" />
                                    <span>Write a Review</span>
                                </button>
                            </div>
                        )
                    ) : (
                        /* Product Owner / Seller Card */
                        <div className="flex flex-col items-center justify-center text-center h-full p-4 gap-2">
                            <div className="size-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                <DynamicLucideIcon name="person" size={20} />
                            </div>
                            <p className="font-bold text-sm text-[#0e181b] dark:text-white">Seller Dashboard</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                                You are the owner of this listing. Customer feedback from campus buyers will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Existing Reviews List */}
            {reviews.length > 0 ? (
                <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                        All Community Reviews ({totalReviews})
                    </h3>
                    <div className="flex flex-col gap-3.5">
                        {reviews.map(review => {
                            const reviewer = reviewers[review.buyer_id] || {};
                            const { text, tags } = parseReviewComment(review.comment);
                            const isMyReview = currentUser && review.buyer_id === currentUser.id;

                            return (
                                <article
                                    key={review.id}
                                    className={`p-5 bg-white dark:bg-[#2c3136] rounded-2xl border transition-all ${
                                        isMyReview
                                            ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm bg-gradient-to-r from-primary/[0.02] to-transparent'
                                            : 'border-black/5 dark:border-white/5 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-primary/10 text-primary overflow-hidden flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-primary/20">
                                                {reviewer.avatar_url ? (
                                                    <Image
                                                        src={reviewer.avatar_url}
                                                        alt={reviewer.display_name || 'Reviewer avatar'}
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>{(reviewer.display_name?.[0] || reviewer.username?.[0] || 'U').toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-sm text-[#0e181b] dark:text-white">
                                                        {reviewer.display_name || reviewer.username || 'Anonymous Student'}
                                                    </span>
                                                    {reviewer.is_verified && (
                                                        <DynamicLucideIcon
                                                            name="verified"
                                                            size={15}
                                                            className="text-[#1daddd]"
                                                            aria-label="Verified User"
                                                        />
                                                    )}
                                                    {isMyReview && (
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                    {timeAgo(review.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Star Rating Badge */}
                                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1 rounded-xl shrink-0">
                                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{review.rating}.0</span>
                                                <DynamicLucideIcon name="star" size={13} fill="currentColor" className="text-yellow-400" aria-hidden="true" />
                                            </div>

                                            {isMyReview && (
                                                <button
                                                    type="button"
                                                    onClick={() => openReviewModal(review)}
                                                    className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                                                    title="Edit review"
                                                    aria-label="Edit review"
                                                >
                                                    <DynamicLucideIcon name="edit" size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3" aria-label="Review tags">
                                            {tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60"
                                                >
                                                    {TAG_ICONS[tag] && (
                                                        <DynamicLucideIcon name={TAG_ICONS[tag]} size={12} className="text-primary" aria-hidden="true" />
                                                    )}
                                                    <span>{tag}</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Comment text */}
                                    {text && (
                                        <p className="mt-3 text-sm text-[#4f5b66] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {text}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* Leave / Edit Review Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="review-modal-title"
                >
                    <div
                        className="bg-white dark:bg-[#1e292b] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="min-w-0 flex-1">
                                <h3 id="review-modal-title" className="text-lg font-bold text-[#0e181b] dark:text-white truncate">
                                    {userReview ? 'Edit Your Review' : 'Rate & Review Item'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={productTitle}>
                                    {productTitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeReviewModal}
                                disabled={submitting}
                                aria-label="Close review dialog"
                                className="size-9 shrink-0 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                            >
                                <DynamicLucideIcon name="close" size={18} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSubmitReview} className="p-5 md:p-6 overflow-y-auto flex flex-col gap-5">
                            {errorMessage && (
                                <div role="alert" className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                                    <DynamicLucideIcon name="error" size={16} className="shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* Star Selection */}
                            <div className="flex flex-col items-center justify-center gap-2 py-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Select Overall Rating
                                </p>
                                <div className="flex items-center gap-2" role="group" aria-label="Star rating picker">
                                    {[1, 2, 3, 4, 5].map(star => {
                                        const activeValue = hoverRating || rating;
                                        const isFilled = star <= activeValue;
                                        return (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                                className="p-1.5 hover:scale-125 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                                            >
                                                <DynamicLucideIcon
                                                    name="star"
                                                    size={34}
                                                    fill={isFilled ? 'currentColor' : 'none'}
                                                    className={`transition-colors ${
                                                        isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-primary min-h-[16px]">
                                    {rating > 0 ? RATING_LABELS[rating - 1] : 'Tap a star to rate'}
                                </span>
                            </div>

                            {/* Quick Tags */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
                                    <span>What went well?</span>
                                    <span className="text-[10px] text-gray-400 font-medium">Optional</span>
                                </label>
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Experience tags">
                                    {TAGS.map(tag => {
                                        const isSelected = selectedTags.includes(tag.label);
                                        return (
                                            <button
                                                key={tag.label}
                                                type="button"
                                                onClick={() => toggleTag(tag.label)}
                                                aria-pressed={isSelected}
                                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border ${
                                                    isSelected
                                                        ? 'bg-primary border-primary text-white shadow-sm'
                                                        : 'bg-white dark:bg-[#2c3136] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/50'
                                                }`}
                                            >
                                                <DynamicLucideIcon name={tag.icon} size={13} aria-hidden="true" />
                                                <span>{tag.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Text Area */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="modal-review-text" className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        Detailed Review
                                    </label>
                                    <span className={`text-[11px] font-mono font-semibold ${reviewText.length >= MAX_REVIEW_LENGTH ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {reviewText.length}/{MAX_REVIEW_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    id="modal-review-text"
                                    rows={4}
                                    maxLength={MAX_REVIEW_LENGTH}
                                    value={reviewText}
                                    onChange={e => setReviewText(e.target.value)}
                                    placeholder="Share details about the item condition, pickup coordination, or seller response..."
                                    className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm text-[#0e181b] dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none transition-all"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={closeReviewModal}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 rounded-full bg-primary hover:bg-[#0b5f76] text-white font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="size-4 border-2 border-white border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <span>{userReview ? 'Save Changes' : 'Submit Review'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
