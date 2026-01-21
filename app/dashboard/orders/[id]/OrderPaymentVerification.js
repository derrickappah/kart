'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OrderPaymentVerification({ orderId, currentStatus }) {
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(null);
  const supabase = createClient();

  const verifyPayment = useCallback(async (reference) => {
    setVerifying(true);
    setMessage(null);

    try {
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          reference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Payment verified successfully! Your order is being processed.',
        });
        // Refresh the page after a short delay to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({
          type: 'info',
          text: 'Payment is being processed. Please wait a moment...',
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setMessage({
        type: 'error',
        text: 'Could not verify payment. The webhook will process it automatically.',
      });
    } finally {
      setVerifying(false);
    }
  }, [orderId]);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    // Only verify if we have a reference and order is still pending
    if (reference && currentStatus === 'Pending') {
      verifyPayment(reference);
    }
  }, [searchParams, currentStatus, verifyPayment]);

  if (!message && !verifying) {
    return null;
  }

  const messageConfig = {
    success: {
      bg: 'bg-green-500/5 dark:bg-green-500/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-500/10 dark:border-green-500/20',
      icon: 'check_circle'
    },
    error: {
      bg: 'bg-red-500/5 dark:bg-red-500/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-500/10 dark:border-red-500/20',
      icon: 'error'
    },
    info: {
      bg: 'bg-[#e9f7fb] dark:bg-[#1daddd]/10',
      text: 'text-[#4f8596] dark:text-[#1daddd]/90',
      border: 'border-[#1daddd]/20',
      icon: 'info'
    },
  };

  const config = messageConfig[message?.type || 'info'];

  return (
    <div className={`p-4 rounded-2xl border ${config.bg} ${config.text} ${config.border} flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center">
        {verifying ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="material-symbols-outlined text-xl">{config.icon}</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {verifying ? (
          <p className="text-sm font-bold leading-tight">Verifying payment status...</p>
        ) : (
          <p className="text-sm font-bold leading-tight">{message?.text}</p>
        )}
      </div>
    </div>
  );
}
