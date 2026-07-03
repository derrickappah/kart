'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function CheckoutClient({ product, user, walletBalance, serviceFee, feePercent, feeFixed }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'paystack'
    const [paymentError, setPaymentError] = useState(null);

    // Calculate totals: Buyer only pays the Marketplace Service Fee
    const price = parseFloat(product.price);
    const total = price + serviceFee;

    // Determine image to show
    const productImage = product.images?.[0] || product.image_url;
    const fallbackImage = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000';
    const [imgSrc, setImgSrc] = useState(productImage || fallbackImage);

    useEffect(() => {
        setImgSrc(productImage || fallbackImage);
    }, [productImage]);

    // Determine balance color
    const canAfford = walletBalance >= total;

    const handleConfirmPay = async () => {
        setLoading(true);
        setPaymentError(null);
        try {
            if (paymentMethod === 'wallet') {
                const response = await fetch('/api/orders/pay-with-wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: product.id }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Payment failed');
                }

                // Success — redirect to order confirmation
                router.push(`/dashboard/orders/${data.orderId}?success=true`);
                router.refresh();
            } else {
                // Paystack Payment
                const { Capacitor } = await import('@capacitor/core');
                const isNative = Capacitor.isNativePlatform();

                const response = await fetch('/api/orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: product.id,
                        quantity: 1,
                        isApp: isNative
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to initialize Paystack');
                }

                if (data.payment?.authorization_url) {
                    if (isNative) {
                        const { Browser } = await import('@capacitor/browser');
                        await Browser.open({ url: data.payment.authorization_url, presentationStyle: 'popover' });
                    } else {
                        window.location.href = data.payment.authorization_url;
                    }
                } else {
                    throw new Error('Payment URL not received');
                }
            }
        } catch (error) {
            console.error('Payment error:', error);
            // Use inline error instead of blocking alert() for better UX and a11y
            setPaymentError(error.message || 'Failed to process payment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] text-[#0e181b] dark:text-white antialiased min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden pb-32">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center bg-[#f6f7f8]/80 dark:bg-[#111d21]/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => router.back()}
                        aria-label="Go back to previous page"
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1daddd]"
                    >
                        <DynamicLucideIcon name="arrow_back_ios_new" className="text-2xl" />
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Review Order</h2>
                </header>

                <main className="flex flex-col gap-4 p-4">
                    {/* Section: Order Summary */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[#333940] dark:text-gray-300 text-sm font-bold uppercase tracking-wider px-1">Order Summary</h3>
                        <div className="bg-white dark:bg-[#1f2229] p-4 rounded-xl card-shadow border border-gray-50 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center gap-4">
                                <div className="size-20 relative rounded-lg shrink-0 border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                                    <Image
                                        src={imgSrc}
                                        alt={product.title}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                        onError={() => setImgSrc(fallbackImage)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    <p className="text-[#0e181b] dark:text-white text-base font-bold leading-tight truncate">{product.title}</p>
                                    <div className="flex items-center gap-1.5">
                                        <DynamicLucideIcon name="person" className="text-[16px] text-[#4f8596]" />
                                        <p className="text-[#4f8596] text-sm font-medium leading-normal">{product.seller?.display_name || 'Unknown Seller'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Price Details */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[#333940] dark:text-gray-300 text-sm font-bold uppercase tracking-wider px-1">Price Details</h3>
                        <div className="bg-white dark:bg-[#1f2229] p-4 rounded-xl card-shadow border border-gray-50 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                            <div className="flex justify-between py-2.5">
                                <p className="text-[#7A818C] dark:text-gray-400 text-base font-medium">Item Price</p>
                                <p className="text-[#0e181b] dark:text-white text-base font-semibold">GHS {price.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between py-2.5">
                                <p className="text-[#7A818C] dark:text-gray-400 text-base font-medium">Service Fee</p>
                                <p className="text-[#0e181b] dark:text-white text-base font-semibold">GHS {serviceFee.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between pt-3 pb-1">
                                <p className="text-[#0e181b] dark:text-white text-lg font-bold">Total</p>
                                <p className="text-[#1daddd] text-xl font-extrabold">GHS {total.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Payment Method Selection */}
                    <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method selection">
                        <h3 className="text-[#333940] dark:text-gray-300 text-sm font-bold uppercase tracking-wider px-1">Choose Payment Method</h3>

                        {/* KART Wallet Option */}
                        <div
                            onClick={() => setPaymentMethod('wallet')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setPaymentMethod('wallet');
                                }
                            }}
                            role="radio"
                            aria-checked={paymentMethod === 'wallet'}
                            tabIndex={0}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1daddd]
                            ${paymentMethod === 'wallet'
                                    ? 'bg-[#1daddd]/5 border-[#1daddd] shadow-[0px_4px_12px_rgba(29,173,221,0.1)]'
                                    : 'bg-white dark:bg-[#1f2229] border-gray-100 dark:border-gray-800'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 flex items-center justify-center rounded-full ${paymentMethod === 'wallet' ? 'bg-[#1daddd] text-white' : 'bg-[#1daddd]/10 text-[#1daddd]'}`}>
                                        <DynamicLucideIcon name="account_balance_wallet" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-[#7A818C] uppercase tracking-tighter">KART Wallet</p>
                                        <p className={`text-base font-bold ${canAfford ? 'text-[#42B883]' : 'text-red-500'}`}>
                                            Balance: GHS {parseFloat(walletBalance).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`size-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'wallet' ? 'border-[#1daddd]' : 'border-gray-200'}`}>
                                    {paymentMethod === 'wallet' && <div className="size-3 rounded-full bg-[#1daddd]"></div>}
                                </div>
                            </div>

                            {!canAfford && paymentMethod === 'wallet' && (
                                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                                    <DynamicLucideIcon name="error" className="text-red-500 text-sm" />
                                    <p className="text-red-500 text-[11px] font-medium leading-tight">Insufficient balance. Please top up or pay with card.</p>
                                </div>
                            )}

                            <div 
                                onClick={(e) => { e.stopPropagation(); router.push('/dashboard/wallet'); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        router.push('/dashboard/wallet');
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors self-end text-[#0e181b] dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1daddd]"
                            >
                                <DynamicLucideIcon name="add" className="text-sm" />
                                <span className="text-sm font-bold">Top Up</span>
                            </div>
                        </div>

                        {/* Direct Paystack Payment Option */}
                        <div
                            onClick={() => setPaymentMethod('paystack')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setPaymentMethod('paystack');
                                }
                            }}
                            role="radio"
                            aria-checked={paymentMethod === 'paystack'}
                            tabIndex={0}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1daddd]
                            ${paymentMethod === 'paystack'
                                    ? 'bg-[#1daddd]/5 border-[#1daddd] shadow-[0px_4px_12px_rgba(29,173,221,0.1)]'
                                    : 'bg-white dark:bg-[#1f2229] border-gray-100 dark:border-gray-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`size-10 flex items-center justify-center rounded-full ${paymentMethod === 'paystack' ? 'bg-[#1daddd] text-white' : 'bg-[#1daddd]/10 text-[#1daddd]'}`}>
                                    <DynamicLucideIcon name="credit_card" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-[#7A818C] uppercase tracking-tighter">Direct Payment</p>
                                    <p className="text-[#0e181b] dark:text-white text-base font-bold">Paystack (Momo/Card)</p>
                                </div>
                            </div>
                            <div className={`size-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'paystack' ? 'border-[#1daddd]' : 'border-gray-200'}`}>
                                {paymentMethod === 'paystack' && <div className="size-3 rounded-full bg-[#1daddd]"></div>}
                            </div>
                        </div>
                    </div>

                    {/* Safety Note */}
                    <div className="bg-[#e9f7fb] dark:bg-[#1daddd]/10 p-4 rounded-xl border border-[#1daddd]/20 flex gap-3">
                        <DynamicLucideIcon name="verified_user" className="text-[#1daddd] shrink-0" />
                        <p className="text-[#4f8596] dark:text-[#1daddd]/90 text-sm leading-snug font-medium">
                            <span className="font-bold">Safety Note:</span> Your funds are held securely in escrow and only released once you confirm the handover.
                        </p>
                    </div>
                </main>

                {/* Fixed Footer CTA */}
                <footer className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-[#f6f7f8]/95 dark:bg-[#111d21]/95 backdrop-blur-md z-40" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                    {/* Inline payment error — replaces disruptive alert() */}
                    {paymentError && (
                        <div
                            role="alert"
                            className="mb-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
                        >
                            {paymentError}
                        </div>
                    )}
                    <button
                        onClick={handleConfirmPay}
                        disabled={loading || (paymentMethod === 'wallet' && !canAfford)}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1daddd]
                        ${(paymentMethod === 'paystack' || canAfford)
                                ? 'bg-[#1daddd] hover:bg-[#1daddd]/90 text-white shadow-[#1daddd]/20'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                    >
                        {loading
                            ? <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" aria-label="Processing payment…" />
                            : (
                                <>
                                    <span>{paymentMethod === 'wallet' ? 'Confirm and Pay' : 'Pay with Paystack'}</span>
                                    <DynamicLucideIcon name="chevron_right" aria-hidden="true" />
                                </>
                            )
                        }
                    </button>
                </footer>
            </div>
        </div>
    );
}
