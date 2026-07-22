'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function BuyButton({ product }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    const isAvailable = product.status === 'Active' || product.status === 'active';
    const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;

    const handleBuyNow = async () => {
        setLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push(`/login?next=/marketplace/${product.id}/buy`);
                return;
            }

            if (user.id === product.seller_id) {
                setError('You cannot purchase your own product');
                setLoading(false);
                return;
            }

            router.push(`/marketplace/${product.id}/buy`);
        } catch (err) {
            console.error('Buy error:', err);
            setError(err.message || 'Failed to process purchase. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isAvailable || isOutOfStock) {
        return (
            <button 
                className="flex-[2] h-14 rounded-2xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed border border-black/5 dark:border-white/5" 
                disabled
                aria-disabled="true"
            >
                <DynamicLucideIcon name="block" aria-hidden="true" />
                <span>{isOutOfStock ? 'Out of Stock' : 'Not Available'}</span>
            </button>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-2">
            {error && (
                <div role="alert" className="text-red-600 dark:text-red-400 text-xs font-semibold px-1">
                    {error}
                </div>
            )}
            <button
                onClick={handleBuyNow}
                disabled={loading}
                aria-label={loading ? 'Processing purchase request…' : 'Buy item now'}
                className="w-full h-14 rounded-2xl bg-[#0e7490] hover:bg-[#0b5f76] dark:bg-gradient-to-r dark:from-primary dark:to-[#159ac6] text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-[0_10px_20px_-10px_rgba(14,116,144,0.4)] dark:shadow-[0_10px_20px_-10px_rgba(29,173,221,0.5)] active:scale-[0.98] transition-all disabled:opacity-50 whitespace-nowrap px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                {loading ? (
                    <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" aria-hidden="true" />
                ) : (
                    <>
                        <DynamicLucideIcon name="shopping_bag" size={20} aria-hidden="true" />
                        <span>Buy Now</span>
                    </>
                )}
            </button>
        </div>
    );
}
