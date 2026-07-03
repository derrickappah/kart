'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PromotionClient({ product, pricing = {}, activeAds = [] }) {
    const router = useRouter();
    const [selectedTier, setSelectedTier] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const activeAdForType = (type) => {
        return activeAds.find(ad => ad.ad_type === type);
    };

    const tiers = [
        {
            id: 'daily',
            name: 'Daily Blast',
            price: pricing.promo_daily_price !== undefined && pricing.promo_daily_price !== null ? pricing.promo_daily_price : 5,
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
            price: pricing.promo_weekly_price !== undefined && pricing.promo_weekly_price !== null ? pricing.promo_weekly_price : 25,
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
            price: pricing.promo_featured_price !== undefined && pricing.promo_featured_price !== null ? pricing.promo_featured_price : 50,
            duration: '30 days',
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

            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            const response = await fetch('/api/promotions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: product.id,
                    tierId: selectedTier,
                    adType: currentTier.adType,
                    amount: currentTier.price,
                    isApp: isNative
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to initialize promotion');
            }

            if (data.redirect_to_success) {
                // Free promotion bypasses payment gateway and activates immediately
                router.push(`/dashboard/seller/listings/promote/success?adId=${data.adId}&productId=${data.productId}&reference=free_promo`);
                return;
            }

            if (data.authorization_url) {
                if (isNative) {
                    const { Browser } = await import('@capacitor/browser');
                    await Browser.open({ url: data.authorization_url, presentationStyle: 'popover' });
                } else {
                    window.location.href = data.authorization_url;
                }
            } else {
                throw new Error('No payment URL received');
            }
        } catch (err) {
            console.error('[PromotionClient] Payment error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f7f7f8] dark:bg-[#111d21] font-display text-[#111617] dark:text-white transition-colors duration-300 min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-[70] bg-white/95 dark:bg-[#111d21]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center p-4 justify-between max-w-lg mx-auto w-full">
                    <button
                        onClick={() => router.back()}
                        aria-label="Go back"
                        className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="arrow_back_ios_new" className="text-2xl text-[#111617] dark:text-white" aria-hidden="true" />
                    </button>
                    <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 text-[#111617] dark:text-white">
                        Boost Listing
                    </h1>
                </div>
            </header>

            <main className="max-w-lg mx-auto pb-48 px-4 space-y-6">
                {/* Item Mini-Preview */}
                <section className="mt-4" aria-label="Listing being promoted">
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        {/* Use Next.js Image to avoid inline style XSS and get automatic optimisation */}
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                            {product.image_url ? (
                                <Image
                                    src={product.image_url}
                                    alt={product.title}
                                    fill
                                    className="object-cover"
                                    sizes="80px"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <DynamicLucideIcon name="image" className="text-slate-300" aria-hidden="true" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Boosting Now</span>
                            <p className="text-base font-bold leading-tight mb-1 truncate text-[#111617] dark:text-white">
                                {product.title}
                            </p>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                ₵{parseFloat(product.price || 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="pr-2 flex-shrink-0">
                            <DynamicLucideIcon name="check_circle" className="text-green-500 font-bold" aria-label="Listing confirmed" />
                        </div>
                    </div>
                </section>

                {/* Error Banner — announced to screen readers immediately */}
                {error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-800/30"
                    >
                        {error}
                    </div>
                )}

                {/* Section Title */}
                <div>
                    <h2 className="text-xl font-extrabold tracking-tight">Select a Promotion Tier</h2>
                    <p className="text-sm text-[#6b4f24] dark:text-[#dfac5a] font-medium">Choose how you want to reach more buyers on campus.</p>
                </div>

                {/* Tier Selection — radiogroup compliant with WCAG keyboard & contrast standards */}
                <div 
                    role="radiogroup" 
                    aria-label="Promotion tiers" 
                    className="space-y-4"
                    onKeyDown={(e) => {
                        const currentIndex = tiers.findIndex(t => t.id === selectedTier);
                        let nextIndex = currentIndex;
                        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            nextIndex = (currentIndex + 1) % tiers.length;
                        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                            e.preventDefault();
                            nextIndex = (currentIndex - 1 + tiers.length) % tiers.length;
                        }
                        if (nextIndex !== currentIndex) {
                            const nextTierId = tiers[nextIndex].id;
                            setSelectedTier(nextTierId);
                            // Set focus to the selected card
                            const card = document.getElementById(`tier-card-${nextTierId}`);
                            if (card) {
                                card.focus();
                            }
                        }
                    }}
                >
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            id={`tier-card-${tier.id}`}
                            onClick={() => setSelectedTier(tier.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedTier(tier.id);
                                }
                            }}
                            role="radio"
                            aria-checked={selectedTier === tier.id}
                            tabIndex={selectedTier === tier.id ? 0 : -1}
                            className={`group relative flex flex-col p-5 rounded-2xl border-2 transition-all shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff9f0f] ${
                                selectedTier === tier.id
                                    ? 'border-[#ff9f0f] bg-white dark:bg-slate-800 shadow-lg ring-1 ring-[#ff9f0f]/20'
                                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/5 hover:border-primary/20'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-[#111617] dark:text-white">{tier.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-black text-[#111617] dark:text-white">{tier.price}</span>
                                        <span className="text-sm font-bold uppercase text-[#111617] dark:text-white">₵</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">/ {tier.duration}</span>
                                    </div>
                                </div>
                                {tier.tag && (
                                    <div
                                        className={`${tier.tagColor} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm`}
                                        aria-label={`Tag: ${tier.tag}`}
                                    >
                                        {tier.tag}
                                    </div>
                                )}
                            </div>
                            <ul className="space-y-3 mb-4">
                                {tier.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3">
                                        <DynamicLucideIcon
                                            name="check_circle"
                                            className={`text-xl ${selectedTier === tier.id ? 'text-[#ff9f0f]' : 'text-primary'}`}
                                            aria-hidden="true"
                                        />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            {activeAdForType(tier.adType) && (
                                <div className="mb-4 text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5 bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20">
                                    <DynamicLucideIcon name="info" className="text-base shrink-0" aria-hidden="true" />
                                    <span>
                                        Active promo ends {new Date(activeAdForType(tier.adType).end_date).toLocaleDateString()}. Buying this will extend it!
                                    </span>
                                </div>
                            )}
                            <div
                                className={`mt-2 flex items-center justify-center py-3 rounded-xl font-bold text-sm transition-all border ${
                                    selectedTier === tier.id
                                        ? 'bg-[#ff9f0f] text-[#111617] border-[#ff9f0f] shadow-md shadow-orange-500/20'
                                        : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-white/5'
                                }`}
                                aria-hidden="true"
                            >
                                {selectedTier === tier.id ? 'Selected Plan' : 'Select Plan'}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Sticky Bottom Payment Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 z-[100]">
                <div className="max-w-lg mx-auto flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Total to pay</span>
                        <span className="text-2xl font-black text-primary drop-shadow-sm">
                            ₵{currentTier.price}
                        </span>
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        aria-busy={loading}
                        aria-label={loading ? 'Initializing payment, please wait' : `Continue to payment — ₵${currentTier.price} for ${currentTier.name}`}
                        className="w-full h-14 bg-primary text-white text-lg font-black rounded-2xl shadow-xl shadow-primary/30 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <DynamicLucideIcon name="progress_activity" className="animate-spin text-xl" aria-hidden="true" />
                                Initializing…
                            </>
                        ) : (
                            <>
                                Continue to Payment
                                <DynamicLucideIcon name="arrow_forward" className="font-bold" aria-hidden="true" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
