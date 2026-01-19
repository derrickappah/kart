'use client';
import { useState } from 'react';

export default function ManualActivationButton({ subscriptionId, paymentReference }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleActivate = async () => {
    if (!confirm('This will manually verify and activate your subscription. Continue?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/subscriptions/manual-activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          reference: paymentReference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate subscription');
      }

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Subscription activated successfully! Refreshing page...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Activation failed',
        });
      }
    } catch (error) {
      console.error('Manual activation error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to activate subscription. Please try again or contact support.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        onClick={handleActivate}
        disabled={loading}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-sm)',
          cursor: loading ? 'wait' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
        }}
      >
        {loading ? 'Activating...' : '🔧 Manually Activate'}
      </button>
      {message && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          fontSize: '0.875rem',
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
