'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfirmDeliveryButton({ orderId, orderStatus }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Only show button if order is Paid or Shipped
    if (orderStatus !== 'Paid' && orderStatus !== 'Shipped') {
        return null;
    }

    const handleConfirmDelivery = async () => {
        if (!confirm('Are you sure you want to confirm delivery? This action cannot be undone.')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/orders/confirm-delivery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ orderId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to confirm delivery');
            }

            // Refresh the page to show updated status
            router.refresh();
        } catch (err) {
            console.error('Error confirming delivery:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={handleConfirmDelivery}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#1daddd] to-[#42B883] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
                {isLoading ? (
                    <>
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        <span>Confirming...</span>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">check_circle</span>
                        <span>Confirm Delivery</span>
                    </>
                )}
            </button>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-xl shrink-0">error</span>
                    <p className="text-red-500 text-sm font-medium">{error}</p>
                </div>
            )}
        </div>
    );
}
