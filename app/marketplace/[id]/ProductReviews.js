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

export default function ProductReviews({ productId, sellerId, productTitle, isOwner }) {
    const router = useRouter();
    const [reviews, setReviews] = useState([]);
    const [reviewers, setReviewers] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
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
            const { data: { user } } = await supabase.auth.getUser();
            if (active) {
                setCurrentUser(user);
            }
            await fetchReviews();
        };

        checkAuthAndFetch();

        return () => {
            active = false;
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

    const openReviewModal = (existing = null) => {
        if (!currentUser) {
            router.push(`/login?returnUrl=/marketplace/${productId}`);
            return;
        }

        const toEdit = existing || userReview;
        if (toEdit) {
            setRating(toEdit.rating || 0);
            const { text, tags } = parseReviewComment(toEdit.comment);
            setReviewText(text || '');
            setSelectedTags(tags || []);
        } else {
            setRating(0);
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

            setSuccessFeedback(userReview ? 'Review updated!' : 'Review submitted successfully!');
            setTimeout(() => setSuccessFeedback(null), 3000);

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

    return (
        <section className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800" aria-labelledby="reviews-heading">
            {/* Header & Write CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 id="reviews-heading" className="text-xl md:text-2xl font-extrabold text-[#0e181b] dark:text-white flex items-center gap-2">
                        <span>Ratings & Reviews</span>
                        {totalReviews > 0 && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                {totalReviews}
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Feedback from buyers on this listing
                    </p>
                </div>

                {!isOwner && (
                    <div className="flex items-center gap-2">
                        {successFeedback && (
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full animate-fade-in">
                                {successFeedback}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => openReviewModal(userReview)}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-[#0b5f76] text-white font-bold text-sm shadow-sm active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <DynamicLucideIcon name={userReview ? "edit" : "rate_review"} size={16} aria-hidden="true" />
                            <span>{userReview ? 'Edit Your Review' : 'Leave a Review'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Ratings Breakdown Summary Card */}
            {totalReviews > 0 ? (
                <div className="p-5 md:p-6 bg-white dark:bg-[#2c3136] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left: Overall Score */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-2 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800">
                        <div className="text-4xl md:text-5xl font-black text-[#0e181b] dark:text-white tracking-tight">
                            {averageRating}
                        </div>
                        <div className="flex items-center gap-1 my-2" aria-label={`Rating: ${averageRating} out of 5 stars`}>
                            {[1, 2, 3, 4, 5].map(star => {
                                const roundedAvg = parseFloat(averageRating || 0);
                                const isFilled = star <= Math.round(roundedAvg);
                                return (
                                    <DynamicLucideIcon
                                        key={star}
                                        name="star"
                                        size={18}
                                        fill={isFilled ? 'currentColor' : 'none'}
                                        className={isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                                        aria-hidden="true"
                                    />
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                            Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                        </p>
                    </div>

                    {/* Right: Distribution Bars */}
                    <div className="md:col-span-8 flex flex-col gap-2">
                        {distribution.map(({ stars, count, percentage }) => (
                            <div key={stars} className="flex items-center gap-3 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                <span className="w-6 text-right shrink-0 flex items-center justify-end gap-0.5">
                                    <span>{stars}</span>
                                    <DynamicLucideIcon name="star" size={12} fill="currentColor" className="text-yellow-400" aria-hidden="true" />
                                </span>
                                <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700/60 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                        role="progressbar"
                                        aria-valuenow={percentage}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    />
                                </div>
                                <span className="w-10 text-right text-gray-400 dark:text-gray-500 font-mono text-[11px] shrink-0">
                                    {count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* Empty state */
                <div className="p-8 text-center bg-white dark:bg-[#2c3136] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm mb-6 flex flex-col items-center justify-center gap-3">
                    <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <DynamicLucideIcon name="rate_review" size={28} aria-hidden="true" />
                    </div>
                    <div className="max-w-md">
                        <h3 className="text-base font-bold text-[#0e181b] dark:text-white">No reviews yet</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            Be the first to share your experience with this item and help the campus community make informed choices.
                        </p>
                    </div>
                    {!isOwner && (
                        <button
                            type="button"
                            onClick={() => openReviewModal()}
                            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-[#0b5f76] text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                        >
                            <DynamicLucideIcon name="rate_review" size={14} aria-hidden="true" />
                            <span>Write the First Review</span>
                        </button>
                    )}
                </div>
            )}

            {/* Reviews List */}
            {reviews.length > 0 && (
                <div className="flex flex-col gap-4">
                    {reviews.map(review => {
                        const reviewer = reviewers[review.buyer_id] || {};
                        const { text, tags } = parseReviewComment(review.comment);
                        const isMyReview = currentUser && review.buyer_id === currentUser.id;

                        return (
                            <article
                                key={review.id}
                                className={`p-4 md:p-5 bg-white dark:bg-[#2c3136] rounded-2xl border transition-all ${
                                    isMyReview
                                        ? 'border-primary/40 ring-1 ring-primary/20 shadow-sm'
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
                                                <span>{(reviewer.display_name?.[0] || 'U').toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-sm text-[#0e181b] dark:text-white">
                                                    {reviewer.display_name || reviewer.username || 'Anonymous Student'}
                                                </span>
                                                {reviewer.is_verified && (
                                                    <DynamicLucideIcon
                                                        name="verified"
                                                        size={14}
                                                        className="text-[#1daddd]"
                                                        aria-label="Verified User"
                                                    />
                                                )}
                                                {isMyReview && (
                                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {timeAgo(review.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Star Rating Badge */}
                                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-2.5 py-1 rounded-lg shrink-0">
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{review.rating}.0</span>
                                        <DynamicLucideIcon name="star" size={13} fill="currentColor" className="text-yellow-400" aria-hidden="true" />
                                    </div>
                                </div>

                                {/* Tags */}
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3" aria-label="Review tags">
                                        {tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60"
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

                                {isMyReview && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => openReviewModal(review)}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <DynamicLucideIcon name="edit" size={13} aria-hidden="true" />
                                            <span>Edit Review</span>
                                        </button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Leave / Edit Review Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="review-modal-title"
                >
                    <div
                        className="bg-white dark:bg-[#1e292b] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div>
                                <h3 id="review-modal-title" className="text-lg font-bold text-[#0e181b] dark:text-white">
                                    {userReview ? 'Update Your Review' : 'Rate & Review Listing'}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">
                                    {productTitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeReviewModal}
                                disabled={submitting}
                                aria-label="Close review dialog"
                                className="size-9 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
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
                            <div className="flex flex-col items-center justify-center gap-2 py-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
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
                                                className="p-1 hover:scale-125 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                                            >
                                                <DynamicLucideIcon
                                                    name="star"
                                                    size={32}
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
                                    <span>What was your experience?</span>
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
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
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
                                        Your Review Details
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
                                    placeholder="Tell other students about the item quality, accuracy, seller responsiveness, or pickup experience..."
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
                                        <span>{userReview ? 'Update Review' : 'Submit Review'}</span>
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
