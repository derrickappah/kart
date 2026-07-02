'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkAsShippedButton({ orderId }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleMarkAsShipped = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/orders/mark-shipped', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update order status');
            }

            // Success - refresh the server component state
            router.refresh();
        } catch (err) {
            console.error('Error marking order as shipped:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={handleMarkAsShipped}
                disabled={isLoading}
                aria-label={isLoading ? 'Updating order status, please wait' : 'Mark this order as shipped'}
                className="w-full bg-gradient-to-r from-[#1daddd] to-[#42B883] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group focus-visible:ring-2 focus-visible:ring-[#1daddd] focus-visible:ring-offset-2"
            >
                {isLoading ? (
                    <>
                        <DynamicLucideIcon name="refresh" className="animate-spin" />
                        <span>Updating Status...</span>
                    </>
                ) : (
                    <>
                        <DynamicLucideIcon name="local_shipping" className="group-hover:scale-110 transition-transform" />
                        <span>Mark as Shipped</span>
                    </>
                )}
            </button>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-in slide-in-from-top-2" role="alert">
                    <DynamicLucideIcon name="error" className="text-red-500 text-xl shrink-0" />
                    <p className="text-red-500 text-sm font-medium">{error}</p>
                </div>
            )}
        </div>
    );
}
