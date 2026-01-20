'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewClient({ orderId, seller, product }) {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState([]);
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const tags = [
        { icon: 'thumb_up', label: 'Fair Price' },
        { icon: 'schedule', label: 'Punctual' },
        { icon: 'check_circle', label: 'Item as Described' },
        { icon: 'sentiment_satisfied', label: 'Friendly' },
        { icon: 'bolt', label: 'Quick Response' }
    ];

    const toggleTag = (label) => {
        if (selectedTags.includes(label)) {
            setSelectedTags(selectedTags.filter(t => t !== label));
        } else {
            setSelectedTags([...selectedTags, label]);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            alert('Please select a rating');
            return;
        }

        setSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Log the review data (in a real app, this would go to the backend)
        console.log('Submitting review:', {
            orderId,
            sellerId: seller.id,
            rating,
            tags: selectedTags,
            comment: reviewText
        });

        router.push(`/dashboard/orders/${orderId}/review/success`);
    };

    const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Great'];
    const currentRatingLabel = rating > 0 ? ratingLabels[rating - 1] : '';

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full max-w-md mx-auto flex-col group/design-root overflow-x-hidden shadow-2xl bg-[#f6f7f8] dark:bg-[#111d21]">

                {/* Top App Bar */}
                <div className="sticky top-0 z-30 bg-[#f6f7f8]/90 dark:bg-[#111d21]/90 backdrop-blur-md transition-colors duration-200">
                    <div className="flex items-center p-4 pb-2 justify-between">
                        <button
                            onClick={() => router.back()}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[#101914] dark:text-[#e5e7eb]" style={{ fontSize: '24px' }}>arrow_back</span>
                        </button>
                        <h2 className="text-[#101914] dark:text-[#e5e7eb] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Rate Transaction</h2>
                        <div className="w-0"></div>
                    </div>
                </div>

                {/* Main Content Scroll Area */}
                <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">

                    {/* Seller Profile Card */}
                    <div className="px-4 py-2 mt-2">
                        <div className="bg-white dark:bg-[#2d333b] rounded-2xl p-6 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col items-center gap-4 border border-gray-100 dark:border-gray-700/50 relative overflow-hidden group">
                            {/* Decorative background blob */}
                            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#1daddd]/10 to-transparent opacity-50"></div>

                            {/* Avatar */}
                            <div className="relative">
                                <div
                                    className="size-24 rounded-full bg-gray-200 bg-center bg-cover border-4 border-white dark:border-[#2d333b] shadow-sm z-10 relative"
                                    style={{ backgroundImage: `url("${seller.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKEcYrN9TwP-tsBns7angRTIGCGvEtYCAhNOSVI5LLUnHEwwlu6BscB-k1JnMHrBlQoXMoNi835zfE5h-CD2WjMDTwDrIswuYic0KgWkJM7oJ2qGGJTNXTUzK_eQQvfJAkKyicDUqR93avYeZFdCPfpmaZy2WHcOV2haVlXW069ufSN6xlOQCW9-gwEuUVyAbsVzFsNnHOKDLM2HvfjTXvBH9T3DWFsUaDNwwNwKTsJXE3cypnCGwpHm7NCNlFUti5eteYWiVqD6mA'}")` }}
                                >
                                </div>
                                {seller.is_verified && (
                                    <div className="absolute bottom-0 right-0 z-20 bg-white dark:bg-[#2d333b] rounded-full p-1 shadow-sm">
                                        <span className="material-symbols-outlined text-[#1daddd]" style={{ fontSize: '20px' }}>verified</span>
                                    </div>
                                )}
                            </div>

                            {/* Name & Status */}
                            <div className="flex flex-col items-center text-center z-10">
                                <h3 className="text-[#101914] dark:text-[#e5e7eb] text-xl font-bold tracking-tight">Rate {seller.display_name}</h3>
                                <p className="text-[#6b7280] dark:text-[#9ca3af] text-sm font-medium mt-1">Transaction verified • {product ? product.title : 'Item purchased'}</p>
                            </div>

                            {/* Divider */}
                            <div className="w-full h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                            {/* Star Rating Interaction */}
                            <div className="flex flex-col items-center gap-3 w-full">
                                <p className="text-[#101914] dark:text-[#e5e7eb] font-semibold text-lg">How was your experience?</p>
                                <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="group/star focus:outline-none transition-transform active:scale-90 hover:scale-110"
                                        >
                                            <span
                                                className={`material-symbols-outlined text-[40px] sm:text-[48px] drop-shadow-sm ${star <= rating ? 'text-[#1daddd]' : 'text-gray-300 dark:text-gray-600'}`}
                                                style={{ fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0" }}
                                            >
                                                star
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[#1daddd] font-bold text-sm tracking-wide uppercase mt-1 min-h-[20px]">{currentRatingLabel}</p>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Tags Section */}
                    <div className="px-6 pt-8 pb-4">
                        <h3 className="text-[#101914] dark:text-[#e5e7eb] text-base font-bold mb-4 flex items-center gap-2">
                            What went well?
                            <span className="text-xs font-normal text-[#6b7280] dark:text-[#9ca3af] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Select all that apply</span>
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.label);
                                return (
                                    <button
                                        key={tag.label}
                                        onClick={() => toggleTag(tag.label)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all border
                                            ${isSelected
                                                ? 'bg-[#1daddd] text-[#101914] shadow-md shadow-[#1daddd]/20 ring-2 ring-[#1daddd] border-transparent'
                                                : 'bg-transparent border-gray-200 dark:border-gray-700 text-[#6b7280] dark:text-[#9ca3af] hover:border-[#1daddd]/50 hover:bg-[#1daddd]/5 hover:text-[#1daddd]'
                                            }`}
                                    >
                                        <span
                                            className="material-symbols-outlined text-lg"
                                            style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
                                        >
                                            {tag.icon}
                                        </span>
                                        {tag.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Review Input Section */}
                    <div className="px-4 pt-4">
                        <label className="sr-only" htmlFor="review">Write a review</label>
                        <div className="relative group">
                            <textarea
                                className="w-full bg-white dark:bg-[#2d333b] border-0 ring-1 ring-gray-200 dark:ring-gray-700 rounded-xl p-4 text-[#101914] dark:text-[#e5e7eb] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-[#1daddd] focus:bg-white dark:focus:bg-[#252a30] transition-all resize-none shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.02)] text-base leading-relaxed"
                                id="review"
                                name="review"
                                placeholder="Write a review (optional)..."
                                rows="4"
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                            ></textarea>
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                                <span className="text-xs text-gray-400 font-medium">{reviewText.length}/500</span>
                            </div>
                        </div>
                        <p className="text-xs text-[#6b7280] dark:text-[#9ca3af] mt-2 ml-1">Your review helps other students on campus.</p>
                    </div>

                    {/* Bottom Spacer */}
                    <div className="h-6"></div>
                </div>

                {/* Sticky Bottom Footer with Submit Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pt-0 bg-gradient-to-t from-[#f6f7f8] via-[#f6f7f8] to-transparent dark:from-[#111d21] dark:via-[#111d21] pointer-events-none pb-8 h-32 flex items-end">
                    <div className="w-full pointer-events-auto">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full bg-[#1daddd] hover:bg-[#6cd49d] text-[#101914] font-bold text-lg py-4 rounded-xl shadow-lg shadow-[#1daddd]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {submitting ? 'Submitting...' : 'Submit Review'}
                            {!submitting && <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
