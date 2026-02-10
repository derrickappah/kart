'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function OrderPaymentVerification({ orderId, currentStatus }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const supabase = createClient();

  const verifyPayment = useCallback(async (reference, isRetry = false) => {
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
          text: 'Payment verified successfully! Refreshing page...',
        });
        // Refresh the page after a short delay to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Payment verification returned false - could be pending or failed
        if (retryCount < 2 && !isRetry) {
          // Auto-retry once after 3 seconds
          setMessage({
            type: 'info',
            text: 'Payment is being processed. Retrying verification...',
          });
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            verifyPayment(reference, true);
          }, 3000);
        } else {
          // Show manual refresh option after retries exhausted
          setMessage({
            type: 'warning',
            text: data.message || 'Payment verification is taking longer than expected.',
            showRefresh: true,
          });
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Could not verify payment. Please refresh the page or contact support.',
        showRefresh: true,
      });
    } finally {
      setVerifying(false);
    }
  }, [orderId, retryCount]);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    // Only verify if we have a reference and order is still pending
    if (reference && currentStatus === 'Pending' && retryCount === 0) {
      verifyPayment(reference);
    }
  }, [searchParams, currentStatus, verifyPayment, retryCount]);

  const handleManualRefresh = () => {
    window.location.reload();
  };

  const handleRetry = () => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (reference) {
      setRetryCount(0);
      verifyPayment(reference);
    }
  };

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
    warning: {
      bg: 'bg-yellow-500/5 dark:bg-yellow-500/10',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-500/10 dark:border-yellow-500/20',
      icon: 'warning'
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
    <div className={`p-4 rounded-2xl border ${config.bg} ${config.text} ${config.border} flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-500`}>
      <div className="flex items-center gap-3">
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

      {message?.showRefresh && !verifying && (
        <div className="flex gap-2">
          <button
            onClick={handleManualRefresh}
            className="flex-1 px-4 py-2 bg-white/20 dark:bg-black/20 rounded-xl font-bold text-xs hover:bg-white/30 dark:hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Refresh Page</span>
          </button>
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 bg-white/20 dark:bg-black/20 rounded-xl font-bold text-xs hover:bg-white/30 dark:hover:bg-black/30 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">replay</span>
            <span>Retry Verification</span>
          </button>
        </div>
      )}
    </div>
  );
}
