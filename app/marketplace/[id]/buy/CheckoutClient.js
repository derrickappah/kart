'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function CheckoutClient({ product, user, walletBalance }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Calculate totals
    const price = parseFloat(product.price);
    const serviceFee = 1.50; // Fixed fee for now as per design
    const total = price + serviceFee;

    // Determine image to show
    const productImage = product.images?.[0] || product.image_url;

    // Determine balance color
    const canAfford = walletBalance >= total;

    const handleConfirmPay = () => {
        setLoading(true);
        // Simulate payment processing
        setTimeout(() => {
            alert('Payment functionality coming soon!');
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] text-[#0e181b] dark:text-white antialiased min-h-screen font-display">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden pb-32">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center bg-[#f6f7f8]/80 dark:bg-[#111d21]/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => router.back()}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Review Order</h2>
                </header>

                <main className="flex flex-col gap-4 p-4">
                    {/* Section: Order Summary */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[#333940] dark:text-gray-300 text-sm font-bold uppercase tracking-wider px-1">Order Summary</h3>
                        <div className="bg-white dark:bg-[#1f2229] p-4 rounded-xl card-shadow border border-gray-50 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center gap-4">
                                <div
                                    className="size-20 bg-center bg-no-repeat bg-cover rounded-lg shrink-0 border border-gray-100 dark:border-gray-700"
                                    style={{ backgroundImage: `url("${productImage}")` }}
                                >
                                </div>
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    <p className="text-[#0e181b] dark:text-white text-base font-bold leading-tight truncate">{product.title}</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px] text-[#4f8596]">person</span>
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
                                <p className="text-[#7A818C] dark:text-gray-400 text-base font-medium">Small Service Fee</p>
                                <p className="text-[#0e181b] dark:text-white text-base font-semibold">GHS {serviceFee.toFixed(2)}</p>
                            </div>
                            <div className="flex justify-between pt-3 pb-1">
                                <p className="text-[#0e181b] dark:text-white text-lg font-bold">Total</p>
                                <p className="text-[#1daddd] text-xl font-extrabold">GHS {total.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section: Payment Method */}
                    <div className="flex flex-col gap-3">
                        <h3 className="text-[#333940] dark:text-gray-300 text-sm font-bold uppercase tracking-wider px-1">Payment Method</h3>
                        <div className="bg-white dark:bg-[#1f2229] p-4 rounded-xl card-shadow border border-gray-50 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 flex items-center justify-center bg-[#1daddd]/10 rounded-full">
                                        <span className="material-symbols-outlined text-[#1daddd]">account_balance_wallet</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-[#7A818C] uppercase tracking-tighter">KART Wallet</p>
                                        <p className={`text-base font-bold ${canAfford ? 'text-[#42B883]' : 'text-red-500'}`}>
                                            Balance: GHS {parseFloat(walletBalance).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    <span className="text-sm font-bold">Top Up</span>
                                </div>
                            </div>
                            {!canAfford && (
                                <p className="text-red-500 text-xs mt-2 pl-1">Insufficient balance. Please top up your wallet.</p>
                            )}
                        </div>
                    </div>

                    {/* Safety Note */}
                    <div className="bg-[#e9f7fb] dark:bg-[#1daddd]/10 p-4 rounded-xl border border-[#1daddd]/20 flex gap-3">
                        <span className="material-symbols-outlined text-[#1daddd] shrink-0">verified_user</span>
                        <p className="text-[#4f8596] dark:text-[#1daddd]/90 text-sm leading-snug font-medium">
                            <span className="font-bold">Safety Note:</span> Your funds are held securely in escrow and only released once you confirm the handover.
                        </p>
                    </div>
                </main>

                {/* Fixed Footer CTA */}
                <footer className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 pb-8 bg-[#f6f7f8]/95 dark:bg-[#111d21]/95 backdrop-blur-md z-40">
                    <button
                        onClick={handleConfirmPay}
                        disabled={loading || !canAfford}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] 
                        ${canAfford
                                ? 'bg-[#1daddd] hover:bg-[#1daddd]/90 text-white shadow-[#1daddd]/20'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                    >
                        <span>{loading ? 'Processing...' : 'Confirm and Pay'}</span>
                        {!loading && <span className="material-symbols-outlined">chevron_right</span>}
                    </button>
                </footer>
            </div>
        </div>
    );
}
