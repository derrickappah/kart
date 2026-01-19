'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EscrowManagementClient({ order }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const handleReleaseEscrow = async () => {
    if (!confirm(`Are you sure you want to release GHS ${parseFloat(order.seller_payout_amount).toFixed(2)} to the seller?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/wallet/release-escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to release escrow');
      }

      setSuccess('Escrow released successfully!');
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to release escrow');
    } finally {
      setLoading(false);
    }
  };

  const canRelease = order.escrow_status === 'Held' && order.status === 'Paid';

  return (
    <div className={`${styles.card} ${styles.escrowCard}`}>
      <h2 className={styles.sectionTitle}>
        <svg className={styles.sectionTitleIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Escrow Management
      </h2>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {success}
        </div>
      )}

      <div className={styles.escrowHeader}>
        <div className={styles.escrowInfo}>
          <p className={styles.escrowLabel}>Escrow Status</p>
          <p className={styles.escrowStatus}>
            {order.escrow_status || 'N/A'}
          </p>
        </div>
        <div className={styles.escrowAmount}>
          <p className={styles.escrowAmountLabel}>Amount to Release</p>
          <p className={styles.escrowAmountValue}>
            GHS {parseFloat(order.seller_payout_amount).toFixed(2)}
          </p>
        </div>
      </div>

      {canRelease && (
        <button
          onClick={handleReleaseEscrow}
          disabled={loading}
          className={styles.escrowButton}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
              </svg>
              Releasing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Release Escrow to Seller
            </>
          )}
        </button>
      )}

      {!canRelease && (
        <p className={styles.escrowMessage}>
          {order.escrow_status === 'Released' && 'Escrow has already been released.'}
          {order.escrow_status === 'Refunded' && 'Escrow has been refunded.'}
          {order.status !== 'Paid' && 'Order must be in Paid status to release escrow.'}
        </p>
      )}

      <div className={styles.escrowNote}>
        <strong>Note:</strong> Releasing escrow will transfer the seller payout amount to the seller's wallet. 
        Platform fees have already been deducted.
      </div>
    </div>
  );
}
