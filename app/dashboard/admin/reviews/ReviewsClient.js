'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ReviewsClient({ initialReviews, stats = {} }) {
    const [reviews, setReviews] = useState(initialReviews);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentFilter = searchParams?.get('rating') || 'all';

    const handleFilterChange = (newFilter) => {
        const params = new URLSearchParams();
        if (newFilter !== 'all') params.set('rating', newFilter);
        router.push(`/dashboard/admin/reviews?${params.toString()}`);
    };

    const handleDelete = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/reviews/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete review');
            }

            // Remove from local state
            setReviews(prev => prev.filter(r => r.id !== reviewId));
        } catch (err) {
            alert('Error deleting review: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Reputation Pulse Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Marketplace Trust', value: stats.average || '0.0', color: 'primary', icon: 'stars', sub: 'Average sentiment' },
                    { label: 'Total Feedback', value: stats.total || 0, color: 'blue-500', icon: 'forum', sub: 'Cumulative reviews' },
                    { label: 'Positive (5★)', value: stats.rating5 || 0, color: 'green-500', icon: 'thumb_up', sub: 'Excellent experiences' },
                    { label: 'Critical (1★)', value: stats.rating1 || 0, color: 'red-500', icon: 'thumb_down', sub: 'Action required' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm transform hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                                stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                                    stat.color === 'red-500' ? 'bg-red-500/10 text-red-500' :
                                        'bg-blue-500/10 text-blue-500'
                                }`}>
                                <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                                <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Sentiment Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
                {['all', '5', '4', '3', '2', '1'].map(rating => (
                    <button
                        key={rating}
                        onClick={() => handleFilterChange(rating)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentFilter === rating
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
                            }`}
                    >
                        {rating === 'all' ? 'All Activity' : `${rating} Star`}
                    </button>
                ))}
            </div>

            {/* Review Intelligence Feed */}
            {reviews.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
                        <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">feedback</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase">Silence on Deck</h3>
                    <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">No reviews matching this criteria were found in the database.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col group hover:border-primary/30 transition-all shadow-sm">
                            <div className="p-6 pb-2 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-background-light dark:bg-[#212b30]/30">
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <span key={i} className={`material-symbols-outlined text-[16px] ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}>
                                            star
                                        </span>
                                    ))}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="p-6 flex-1 space-y-4">
                                <div>
                                    <h4 className="text-[9px] font-black uppercase mr-2 tracking-[0.2em] text-[#4b636c] mb-1">Marketplace Offering</h4>
                                    <p className="text-sm font-black tracking-tighter uppercase line-clamp-1">{review.product?.title || 'Unknown Product'}</p>
                                </div>

                                <div className="bg-white dark:bg-[#212b30] p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] italic text-xs font-black text-[#4b636c] leading-relaxed relative">
                                    <span className="material-symbols-outlined absolute -top-2 -left-2 size-6 bg-white dark:bg-[#182125] rounded-full flex items-center justify-center text-[10px] text-primary border border-[#dce3e5] dark:border-[#2d3b41]">format_quote</span>
                                    {review.comment || 'No textual feedback provided.'}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Buyer</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black">
                                                {review.buyer?.display_name?.charAt(0) || 'B'}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter truncate">{review.buyer?.display_name || 'Anonymous'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Seller</p>
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-[8px] font-black">
                                                {review.seller?.display_name?.charAt(0) || 'S'}
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter truncate">{review.seller?.display_name || 'Anonymous'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-background-light dark:bg-[#212b30]/30 mt-auto flex items-center justify-end border-t border-[#dce3e5] dark:border-[#2d3b41]">
                                <button
                                    onClick={() => handleDelete(review.id)}
                                    disabled={loading}
                                    className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                    {loading ? 'Processing...' : 'Delete Review'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
