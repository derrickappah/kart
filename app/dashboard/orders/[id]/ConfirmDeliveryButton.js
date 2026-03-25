import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DeliveryVerificationModal from '@/components/DeliveryVerificationModal';

export default function ConfirmDeliveryButton({ orderId, orderStatus }) {
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [buyerEmail, setBuyerEmail] = useState('');

    // Only show button if order is Paid or Shipped
    if (orderStatus !== 'Paid' && orderStatus !== 'Shipped') {
        return null;
    }

    const fetchBuyerEmail = async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('orders')
                .select('buyer:profiles!orders_buyer_id_profiles_fkey(email)')
                .eq('id', orderId)
                .single();
            
            if (data?.buyer?.email) {
                setBuyerEmail(data.buyer.email);
            }
        } catch (err) {
            console.error('Error fetching buyer email:', err);
        }
    };

    const handleInitialClick = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // First fetch the email if we don't have it
            if (!buyerEmail) {
                await fetchBuyerEmail();
            }

            // Send OTP
            const response = await fetch('/api/orders/send-delivery-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send verification code');
            }

            // Show modal
            setIsModalOpen(true);
        } catch (err) {
            console.error('Error starting delivery verification:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyAndConfirm = async (code) => {
        setIsVerifying(true);
        setError(null);

        try {
            const response = await fetch('/api/orders/confirm-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, verificationCode: code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Success
            setIsModalOpen(false);
            router.refresh();
            router.push(`/dashboard/orders/${orderId}/review`);
        } catch (err) {
            console.error('Error confirming delivery:', err);
            setError(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={handleInitialClick}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#1daddd] to-[#42B883] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
                {isLoading ? (
                    <>
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                        <span>Sending Code...</span>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform">check_circle</span>
                        <span>Confirm Delivery</span>
                    </>
                )}
            </button>

            {error && !isModalOpen && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-xl shrink-0">error</span>
                    <p className="text-red-500 text-sm font-medium">{error}</p>
                </div>
            )}

            <DeliveryVerificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onVerify={handleVerifyAndConfirm}
                onResend={handleInitialClick}
                email={buyerEmail}
                loading={isVerifying}
                error={error}
            />
        </div>
    );
}
