'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function BuyButton({ product }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();
    const supabase = createClient();

    const isAvailable = product.status === 'Active' || product.status === 'active';
    const isOutOfStock = product.stock_quantity !== null && product.stock_quantity === 0;

    const handleBuyNow = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            if (user.id === product.seller_id) {
                setError('You cannot purchase your own product');
                setLoading(false);
                return;
            }

            // Redirect to a checkout or order creation page
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
                className="flex-[2] h-14 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed" 
                disabled
            >
                <span className="material-symbols-outlined">block</span>
                {isOutOfStock ? 'Out of Stock' : 'Not Available'}
            </button>
        );
    }

    return (
        <div className="flex-[2] flex flex-col gap-2">
            {error && (
                <div className="text-red-600 dark:text-red-400 text-xs font-semibold px-1">
                    {error}
                </div>
            )}
            <button
                onClick={handleBuyNow}
                disabled={loading}
                className="w-full h-14 rounded-xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
            >
                <span className="material-symbols-outlined">shopping_bag</span>
                {loading ? 'Processing...' : `Buy Now - GHS ${parseFloat(product.price).toFixed(2)}`}
            </button>
        </div>
    );
}
