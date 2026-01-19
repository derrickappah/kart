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

  const messageStyles = {
    success: { background: '#10b98120', color: '#10b981', borderColor: '#10b981' },
    error: { background: '#ef444420', color: '#ef4444', borderColor: '#ef4444' },
    info: { background: '#3b82f620', color: '#3b82f6', borderColor: '#3b82f6' },
  };

  return (
    <div
      style={{
        padding: '1rem',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1rem',
        border: '1px solid',
        ...messageStyles[message?.type || 'info'],
      }}
    >
      {verifying ? (
        <p>Verifying payment...</p>
      ) : (
        <p>{message?.text}</p>
      )}
    </div>
  );
}
