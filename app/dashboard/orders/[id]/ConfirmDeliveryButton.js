'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DeliveryVerificationModal from '@/components/DeliveryVerificationModal';

export default function ConfirmDeliveryButton({ orderId, orderStatus }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [checkingPin, setCheckingPin] = useState(true);

    // Fetch buyer PIN status on mount
    useEffect(() => {
        if (orderStatus !== 'Paid' && orderStatus !== 'Shipped') return;

        const checkPinStatus = async () => {
            try {
                const response = await fetch('/api/settings/delivery-pin/status');
                const data = await response.json();
                if (response.ok) {
                    setHasPin(data.hasPin);
                }
            } catch (err) {
                console.error('Error checking PIN status:', err);
            } finally {
                setCheckingPin(false);
            }
        };

        checkPinStatus();
    }, [orderId, orderStatus]);

    // Only render button if order is Paid or Shipped
    if (orderStatus !== 'Paid' && orderStatus !== 'Shipped') {
        return null;
    }

    const handleConfirmClick = () => {
        setError(null);
        if (!hasPin) {
            // Redirect to settings page to set PIN
            router.push('/dashboard/settings/security/delivery-pin?fromOrder=' + orderId);
            return;
        }
        setIsModalOpen(true);
    };

    const handleVerifyAndConfirm = async (pin) => {
        setIsVerifying(true);
        setError(null);

        try {
            const response = await fetch('/api/orders/confirm-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, verificationCode: pin }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Success — close modal, refresh data, redirect to review page
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
            {checkingPin ? (
                <button
                    disabled
                    className="w-full bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2"
                >
                    <DynamicLucideIcon name="refresh" className="animate-spin" />
                    <span>Checking Security...</span>
                </button>
            ) : !hasPin ? (
                <button
                    onClick={handleConfirmClick}
                    aria-label="Set Delivery PIN to confirm delivery"
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                >
                    <DynamicLucideIcon name="lock" className="group-hover:scale-110 transition-transform" />
                    <span>Set Delivery PIN First</span>
                </button>
            ) : (
                <button
                    onClick={handleConfirmClick}
                    aria-label="Confirm delivery using your Delivery PIN"
                    className="w-full bg-gradient-to-r from-[#1daddd] to-[#42B883] text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group focus-visible:ring-2 focus-visible:ring-[#1daddd] focus-visible:ring-offset-2"
                >
                    <DynamicLucideIcon name="check_circle" className="group-hover:scale-110 transition-transform" />
                    <span>Confirm Delivery</span>
                </button>
            )}

            {!hasPin && !checkingPin && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest text-center mt-1">
                    ⚠️ You must configure a Delivery PIN before confirming receipt.
                </p>
            )}

            {error && !isModalOpen && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2" role="alert">
                    <DynamicLucideIcon name="error" className="text-red-500 text-xl shrink-0" />
                    <p className="text-red-500 text-sm font-medium">{error}</p>
                </div>
            )}

            <DeliveryVerificationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onVerify={handleVerifyAndConfirm}
                loading={isVerifying}
                error={error}
            />
        </div>
    );
}
