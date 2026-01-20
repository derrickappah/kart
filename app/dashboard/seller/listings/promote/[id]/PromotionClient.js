'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PromotionClient({ product }) {
    const router = useRouter();
    const [selectedTier, setSelectedTier] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const tiers = [
        {
            id: 'daily',
            name: 'Daily Blast',
            price: 5,
            duration: '24 hours',
            tag: 'Most Popular',
            tagColor: 'bg-primary/10 text-primary',
            adType: 'Boost',
            features: [
                '24h visibility at the top of the feed',
                'Reach ~500 more students',
                'Instant notification blast'
            ]
        },
        {
            id: 'weekly',
            name: 'Weekly Saver',
            price: 25,
            duration: '7 days',
            tag: 'Best Value',
            tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            adType: 'Boost',
            features: [
                '7 days priority in category searches',
                'Budget-friendly visibility',
                'Consistent search ranking'
            ]
        },
        {
            id: 'featured',
            name: 'Featured Spotlight',
            price: 50,
            duration: 'Lifetime badge',
            tag: 'Premium',
            tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            adType: 'Featured',
            features: [
                "Added to 'Featured' section list",
                'Home screen discovery placement',
                'Premium badge on listing item'
            ]
        }
    ];

    const currentTier = tiers.find(t => t.id === selectedTier);

    const handlePayment = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/promotions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: product.id,
                    tierId: selectedTier,
                    adType: currentTier.adType,
                    amount: currentTier.price
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize promotion');
            }

            if (data.authorization_url) {
                window.location.href = data.authorization_url;
            } else {
                throw new Error('No payment URL received');
            }
        } catch (err) {
            console.error('Promotion error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f7f7f8] dark:bg-[#111d21] font-display text-[#111617] dark:text-white transition-colors duration-300 min-h-screen">
            {/* Header Section */}
            <header className="sticky top-0 z-[70] bg-white/95 dark:bg-[#111d21]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl text-[#111617] dark:text-white">arrow_back_ios_new</span>
                    </button>
                    <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-[#111617] dark:text-white">Boost Listing</h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto pb-48 px-4 space-y-6">
                {/* Item Mini-Preview Section */}
                <section className="mt-4">
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div
                            className="w-20 h-20 rounded-lg bg-center bg-cover flex-shrink-0 bg-slate-100"
                            style={{ backgroundImage: product.image_url ? `url("${product.image_url}")` : 'none' }}
                        >
                            {!product.image_url && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-300">image</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Boosting Now</span>
                            <p className="text-base font-bold leading-tight mb-1 truncate text-[#111617] dark:text-white">{product.title}</p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">₵{product.price}</p>
                        </div>
                        <div className="pr-2 flex-shrink-0">
                            <span className="material-symbols-outlined text-green-500 font-bold">check_circle</span>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm italic">
                        {error}
                    </div>
                )}

                {/* Section Title */}
                <div>
                    <h2 className="text-xl font-extrabold tracking-tight">Select a Promotion Tier</h2>
                    <p className="text-sm text-[#a17c45]">Choose how you want to reach more buyers on campus.</p>
                </div>

                {/* Tiers List */}
                <div className="space-y-4">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            onClick={() => setSelectedTier(tier.id)}
                            className={`group relative flex flex-col p-5 rounded-2xl border-2 transition-all shadow-sm cursor-pointer ${selectedTier === tier.id
                                    ? 'border-[#ff9f0f] bg-white dark:bg-slate-800 shadow-lg ring-1 ring-[#ff9f0f]/20'
                                    : 'bg-white dark:bg-slate-800/60 border-transparent hover:border-primary/20'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-[#111617] dark:text-white">{tier.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-[#111617] dark:text-white">{tier.price}</span>
                                        <span className="text-sm font-bold uppercase text-[#111617] dark:text-white">GHS</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ {tier.duration}</span>
                                    </div>
                                </div>
                                {tier.tag && (
                                    <div className={`${tier.tagColor} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm`}>
                                        {tier.tag}
                                    </div>
                                )}
                            </div>
                            <ul className="space-y-3 mb-4">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined text-xl ${selectedTier === tier.id ? 'text-[#ff9f0f]' : 'text-primary'
                                            }`}>check_circle</span>
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className={`mt-2 flex items-center justify-center py-3 rounded-xl font-bold text-sm transition-all border ${selectedTier === tier.id
                                    ? 'bg-[#ff9f0f] text-white border-[#ff9f0f] shadow-md shadow-orange-500/20'
                                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-white/5'
                                }`}>
                                {selectedTier === tier.id ? 'Selected Plan' : 'Select Plan'}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-[100]">
                <div className="max-w-lg mx-auto flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total to pay</span>
                        <span className="text-2xl font-black text-primary drop-shadow-sm">{currentTier.price} GHS</span>
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        className="w-full h-14 bg-primary text-white text-lg font-black rounded-2xl shadow-xl shadow-primary/30 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Initializing...' : 'Continue to Payment'}
                        {!loading && <span className="material-symbols-outlined font-bold">arrow_forward</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
