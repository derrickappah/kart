'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Refined Client Component for Order Review
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

        try {
            const response = await fetch('/api/reviews/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    productId: product?.id,
                    sellerId: seller.id,
                    rating,
                    comment: selectedTags.length > 0
                        ? `${reviewText}\n\n[Tags: ${selectedTags.join(', ')}]`
                        : reviewText
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit review');
            }

            router.push(`/dashboard/orders/${orderId}/review/success`);
        } catch (error) {
            console.error('Error submitting review:', error);
            alert(error.message || 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Great'];
    const currentRatingLabel = rating > 0 ? ratingLabels[rating - 1] : '';

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] text-[#0e181b] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] min-h-screen antialiased">
            <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col group/design-root overflow-x-hidden pb-32 bg-[#f6f7f8] dark:bg-[#131d1f]">

                {/* Top App Bar */}
                <div className="sticky top-0 z-50 flex items-center bg-[#f6f7f8]/80 dark:bg-[#131d1f]/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => router.back()}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Rate Transaction</h2>
                </div>

                {/* Main Content Scroll Area */}
                <div className="flex flex-col gap-6 p-4">

                    {/* Seller Profile Card */}
                    <div className="bg-white dark:bg-[#1e292b] rounded-2xl p-6 flex flex-col items-center gap-4 relative overflow-hidden group border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                        {/* Decorative background blob */}
                        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-primary/5 to-transparent"></div>

                        {/* Avatar */}
                        <div className="relative">
                            <div
                                className="size-24 rounded-full bg-center bg-cover border-4 border-white dark:border-[#1f2229] shadow-md z-10 relative"
                                style={{ backgroundImage: `url("${seller.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKEcYrN9TwP-tsBns7angRTIGCGvEtYCAhNOSVI5LLUnHEwwlu6BscB-k1JnMHrBlQoXMoNi835zfE5h-CD2WjMDTwDrIswuYic0KgWkJM7oJ2qGGJTNXTUzK_eQQvfJAkKyicDUqR93avYeZFdCPfpmaZy2WHcOV2haVlXW069ufSN6xlOQCW9-gwEuUVyAbsVzFsNnHOKDLM2HvfjTXvBH9T3DWFsUaDNwwNwKTsJXE3cypnCGwpHm7NCNlFUti5eteYWiVqD6mA'}")` }}
                            >
                            </div>
                            {seller.is_verified && (
                                <div className="absolute bottom-0 right-1 z-20 bg-white dark:bg-[#1e292b] rounded-full p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <span className="material-symbols-outlined text-[#1daddd] text-[18px]">verified</span>
                                </div>
                            )}
                        </div>

                        {/* Name & Status */}
                        <div className="flex flex-col items-center text-center z-10">
                            <h3 className="text-lg font-bold tracking-tight">Rate {seller.display_name}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                {product ? product.title : 'Item purchased'}
                            </p>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-gray-50 dark:bg-gray-800/50 my-1"></div>

                        {/* Star Rating Interaction */}
                        <div className="flex flex-col items-center gap-3 w-full">
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">How was your experience?</p>
                            <div className="flex items-center justify-center gap-3 w-full">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="group/star focus:outline-none transition-transform active:scale-90 hover:scale-110"
                                    >
                                        <span
                                            className={`material-symbols-outlined drop-shadow-sm ${star <= rating ? 'text-[#1daddd]' : 'text-gray-200 dark:text-gray-700'}`}
                                            style={{
                                                fontSize: '46px',
                                                fontVariationSettings: star <= rating ? "'FILL' 1, 'opsz' 48" : "'FILL' 0, 'opsz' 48"
                                            }}
                                        >
                                            star
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[#1daddd] font-black text-xs tracking-widest uppercase mt-1 min-h-[16px]">{currentRatingLabel}</p>
                        </div>
                    </div>

                    {/* Feedback Tags Section */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1 flex items-center justify-between">
                            What went well?
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full uppercase">Optional</span>
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.label);
                                return (
                                    <button
                                        key={tag.label}
                                        onClick={() => toggleTag(tag.label)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tight transition-all border
                                            ${isSelected
                                                ? 'bg-[#1daddd] border-[#1daddd] text-white shadow-lg shadow-[#1daddd]/10 active:scale-95'
                                                : 'bg-white dark:bg-[#1e292b] border-gray-100 dark:border-gray-800 text-gray-500 hover:border-[#1daddd]/50 hover:text-[#1daddd]'
                                            }`}
                                    >
                                        <span
                                            className="material-symbols-outlined text-base"
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
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">Write a detailed review</h3>
                        <div className="relative">
                            <textarea
                                className="w-full bg-white dark:bg-[#1e292b] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-[#0e181b] dark:text-white placeholder:text-gray-400 focus:ring-1 focus:ring-[#1daddd]/20 focus:border-[#1daddd] transition-all resize-none shadow-[0px_4px_12px_rgba(0,0,0,0.02)] text-base leading-relaxed"
                                id="review"
                                name="review"
                                placeholder="Share your experience with other students..."
                                rows="4"
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                            ></textarea>
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-50">
                                <span className="text-[10px] font-bold text-gray-400">{reviewText.length}/500</span>
                            </div>
                        </div>
                    </div>

                    {/* Safety Banner */}
                    <div className="bg-[#e9f7fb] dark:bg-[#1daddd]/10 p-4 rounded-2xl border border-[#1daddd]/20 flex gap-3">
                        <span className="material-symbols-outlined text-[#1daddd] shrink-0">verified_user</span>
                        <p className="text-[#4f8596] dark:text-[#1daddd]/90 text-sm leading-snug font-medium">
                            <span className="font-bold">Trust Note:</span> Your review helps maintain a safe marketplace for the university community.
                        </p>
                    </div>

                </div>

                {/* Sticky Bottom Footer with Submit Button */}
                <footer className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 pb-8 bg-[#f6f7f8]/95 dark:bg-[#131d1f]/95 backdrop-blur-md z-40">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-[#1daddd] hover:bg-[#159ac6] text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-[#1daddd]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none uppercase tracking-widest"
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                        {!submitting && <span className="material-symbols-outlined text-2xl">chevron_right</span>}
                    </button>
                </footer>
            </div>

            {/* Global CSS for Material Symbols */}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
        </div>
    );
}
