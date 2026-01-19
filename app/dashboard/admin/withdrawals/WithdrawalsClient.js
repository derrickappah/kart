'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WithdrawalsClient({ initialRequests, stats = {}, error: initialError = null }) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(null);
  const [manualModalOpen, setManualModalOpen] = useState(null);
  const [manualFormData, setManualFormData] = useState({
    manualReference: '',
    manualTransactionId: '',
    manualReceiptUrl: '',
    manualNotes: ''
  });
  const router = useRouter();

  const handleApprove = async (requestId, amount, userId) => {
    if (!confirm(`Approve withdrawal of GHS ${parseFloat(amount).toFixed(2)}? This will process the Paystack transfer.`)) {
      return;
    }

    setLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/withdrawals/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalRequestId: requestId,
          amount,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve withdrawal');
      }

      setSuccess(`Withdrawal approved and transfer initiated!`);
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'Approved', ...data.withdrawal_request } : req
        )
      );
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      // If Paystack failed, keep request as Pending and show retry options
      const errorMessage = err.message || 'Failed to approve withdrawal';
      setError(errorMessage);
      
      // Update request to show it has an error (but keep as Pending)
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId 
            ? { 
                ...req, 
                admin_notes: `Paystack Error: ${errorMessage}`,
                paystack_retry_count: (req.paystack_retry_count || 0) + 1
              } 
            : req
        )
      );
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRetryPaystack = async (requestId, amount, userId) => {
    if (!confirm(`Retry Paystack transfer for GHS ${parseFloat(amount).toFixed(2)}?`)) {
      return;
    }

    setLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/withdrawals/retry-paystack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalRequestId: requestId,
          amount,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry Paystack transfer');
      }

      setSuccess(`Withdrawal approved and transfer initiated via Paystack!`);
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'Approved', ...data.withdrawal_request } : req
        )
      );
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to retry Paystack transfer');
      
      // Update request to show retry failed
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId 
            ? { 
                ...req, 
                admin_notes: `Paystack Error (Retry): ${err.message}`,
                paystack_retry_count: (req.paystack_retry_count || 0) + 1
              } 
            : req
        )
      );
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleManualApprove = async (requestId, amount, userId) => {
    if (!manualFormData.manualReference && !manualFormData.manualTransactionId) {
      setError('Please provide at least a reference or transaction ID');
      return;
    }

    setLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/withdrawals/manual-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalRequestId: requestId,
          amount,
          userId,
          manualReference: manualFormData.manualReference,
          manualTransactionId: manualFormData.manualTransactionId,
          manualReceiptUrl: manualFormData.manualReceiptUrl,
          manualNotes: manualFormData.manualNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to manually approve withdrawal');
      }

      setSuccess(`Withdrawal approved and processed manually!`);
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'Approved', ...data.withdrawal_request } : req
        )
      );
      
      setManualModalOpen(null);
      setManualFormData({
        manualReference: '',
        manualTransactionId: '',
        manualReceiptUrl: '',
        manualNotes: ''
      });
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to manually approve withdrawal');
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const openManualModal = (requestId) => {
    setManualModalOpen(requestId);
    setManualFormData({
      manualReference: '',
      manualTransactionId: '',
      manualReceiptUrl: '',
      manualNotes: ''
    });
  };

  const closeManualModal = () => {
    setManualModalOpen(null);
    setManualFormData({
      manualReference: '',
      manualTransactionId: '',
      manualReceiptUrl: '',
      manualNotes: ''
    });
  };

  const hasPaystackError = (request) => {
    return request.admin_notes && request.admin_notes.includes('Paystack Error');
  };

  const getPaymentMethod = (request) => {
    if (!request.user) return null;
    
    const bankDetails = request.user.bank_account_details;
    const momoDetails = request.user.momo_details;
    
    const hasBankDetails = bankDetails && bankDetails.account_number && bankDetails.bank_code;
    const hasMomoDetails = momoDetails && momoDetails.number && momoDetails.network;
    
    if (hasBankDetails) {
      return {
        type: 'bank',
        details: bankDetails
      };
    } else if (hasMomoDetails) {
      return {
        type: 'mobile_money',
        details: momoDetails
      };
    }
    
    return null;
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    setLoading((prev) => ({ ...prev, [requestId]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/withdrawals/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalRequestId: requestId,
          reason: reason || 'No reason provided',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject withdrawal');
      }

      setSuccess('Withdrawal rejected.');
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'Rejected', admin_notes: reason } : req
        )
      );
      
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reject withdrawal');
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'Pending');
  const otherRequests = requests.filter((r) => r.status !== 'Pending');

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return styles.statusPending;
      case 'Approved': return styles.statusApproved;
      case 'Rejected': return styles.statusRejected;
      case 'Completed': return styles.statusCompleted;
      default: return styles.statusPending;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Withdrawal Requests</h1>
        <p className={styles.subtitle}>Manage and process all withdrawal requests</p>
      </header>

      {/* Stats Row */}
      {stats && Object.keys(stats).length > 0 && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Requests</div>
            <div className={styles.statValue}>{stats.total || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pending</div>
            <div className={styles.statValue}>{stats.pending || 0}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pending Amount</div>
            <div className={styles.statValue}>₵{stats.pendingAmount?.toFixed(2) || '0.00'}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Amount</div>
            <div className={styles.statValue}>₵{stats.totalAmount?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      )}

      {error && (
        <div className={`${styles.alertMessage} ${styles.alertError}`}>
          <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className={`${styles.alertMessage} ${styles.alertSuccess}`}>
          <svg className={styles.alertIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {success}
        </div>
      )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 className={styles.sectionTitle}>
              Pending Requests
              <span className={styles.sectionCount}>{pendingRequests.length}</span>
            </h2>
            <div className={styles.withdrawalsList}>
              {pendingRequests.map((request) => (
                <div key={request.id} className={styles.withdrawalCard}>
                  <div className={styles.cardContent}>
                    <div className={styles.requestInfo}>
                      <h3 className={styles.userName}>
                        {request.user?.display_name || request.user?.email || 'Unknown User'}
                      </h3>
                      <div className={styles.requestDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Email</span>
                          <span className={styles.detailValue}>{request.user?.email || 'Unknown'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Requested</span>
                          <span className={styles.detailValue}>
                            {new Date(request.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {request.wallet && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Wallet Balance</span>
                            <span className={styles.detailValueHighlight}>
                              ₵{parseFloat(request.wallet.balance || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                      {(() => {
                        const paymentMethod = getPaymentMethod(request);
                        if (paymentMethod) {
                          return (
                            <div className={styles.paymentDetails}>
                              <div className={styles.paymentMethodHeader}>
                                <span className={styles.paymentMethodLabel}>
                                  {paymentMethod.type === 'bank' ? 'Bank Account' : 'Mobile Money'}
                                </span>
                                <span className={`${styles.paymentMethodBadge} ${paymentMethod.type === 'bank' ? styles.bankBadge : styles.momoBadge}`}>
                                  {paymentMethod.type === 'bank' ? 'Bank' : 'MoMo'}
                                </span>
                              </div>
                              {paymentMethod.type === 'bank' ? (
                                <div className={styles.paymentInfo}>
                                  {paymentMethod.details.account_name && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Account Name:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.account_name}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.account_number && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Account Number:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.account_number}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.bank_code && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Bank Code:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.bank_code}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={styles.paymentInfo}>
                                  {paymentMethod.details.name && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Name:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.name}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.number && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Number:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.number}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.network && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Network:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.network}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {hasPaystackError(request) && (
                          <div className={styles.errorMessage}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>{request.admin_notes}</span>
                            {request.paystack_retry_count > 0 && (
                              <span className={styles.retryCount}>Retry attempts: {request.paystack_retry_count}</span>
                            )}
                          </div>
                        )}
                    </div>
                    <div className={styles.requestMeta}>
                      <p className={styles.amountDisplay}>
                        ₵{parseFloat(request.amount).toFixed(2)}
                      </p>
                      <div className={styles.actionButtons}>
                        {hasPaystackError(request) ? (
                          <>
                            <button
                              onClick={() => handleRetryPaystack(request.id, request.amount, request.user_id)}
                              disabled={loading[request.id]}
                              className={`${styles.actionButton} ${styles.retryButton}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 4V10H7M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {loading[request.id] ? 'Retrying...' : 'Retry Paystack'}
                            </button>
                            <button
                              onClick={() => openManualModal(request.id)}
                              disabled={loading[request.id]}
                              className={`${styles.actionButton} ${styles.manualButton}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Process Manually
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleApprove(request.id, request.amount, request.user_id)}
                              disabled={loading[request.id]}
                              className={`${styles.actionButton} ${styles.approveButton}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              {loading[request.id] ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={loading[request.id]}
                              className={`${styles.actionButton} ${styles.rejectButton}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Requests */}
        {otherRequests.length > 0 && (
          <div>
            <h2 className={styles.sectionTitle}>
              Processed Requests
              <span className={styles.sectionCount}>{otherRequests.length}</span>
            </h2>
            <div className={styles.withdrawalsList}>
              {otherRequests.map((request) => (
                <div key={request.id} className={styles.withdrawalCard}>
                  <div className={styles.cardContent}>
                    <div className={styles.requestInfo}>
                      <h3 className={styles.userName}>
                        {request.user?.display_name || request.user?.email || 'Unknown User'}
                      </h3>
                      <div className={styles.requestDetails}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Email</span>
                          <span className={styles.detailValue}>{request.user?.email || 'Unknown'}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Requested</span>
                          <span className={styles.detailValue}>
                            {new Date(request.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {request.updated_at && request.updated_at !== request.created_at && (
                          <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Updated</span>
                            <span className={styles.detailValue}>
                              {new Date(request.updated_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      {(() => {
                        const paymentMethod = getPaymentMethod(request);
                        if (paymentMethod) {
                          return (
                            <div className={styles.paymentDetails}>
                              <div className={styles.paymentMethodHeader}>
                                <span className={styles.paymentMethodLabel}>
                                  {paymentMethod.type === 'bank' ? 'Bank Account' : 'Mobile Money'}
                                </span>
                                <span className={`${styles.paymentMethodBadge} ${paymentMethod.type === 'bank' ? styles.bankBadge : styles.momoBadge}`}>
                                  {paymentMethod.type === 'bank' ? 'Bank' : 'MoMo'}
                                </span>
                              </div>
                              {paymentMethod.type === 'bank' ? (
                                <div className={styles.paymentInfo}>
                                  {paymentMethod.details.account_name && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Account Name:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.account_name}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.account_number && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Account Number:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.account_number}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.bank_code && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Bank Code:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.bank_code}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={styles.paymentInfo}>
                                  {paymentMethod.details.name && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Name:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.name}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.number && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Number:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.number}</span>
                                    </div>
                                  )}
                                  {paymentMethod.details.network && (
                                    <div className={styles.paymentInfoItem}>
                                      <span className={styles.paymentInfoLabel}>Network:</span>
                                      <span className={styles.paymentInfoValue}>{paymentMethod.details.network}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {request.admin_notes && (
                        <div className={styles.adminNotes}>
                          <strong>Admin Note:</strong> {request.admin_notes}
                        </div>
                      )}
                      {request.paystack_transfer_reference && (
                        <div className={styles.transferReference}>
                          <strong>Transfer Reference:</strong> {request.paystack_transfer_reference}
                        </div>
                      )}
                      {request.manual_reference && (
                        <div className={styles.manualReference}>
                          <strong>Manual Reference:</strong> {request.manual_reference}
                        </div>
                      )}
                      {request.manual_transaction_id && (
                        <div className={styles.manualReference}>
                          <strong>Transaction ID:</strong> {request.manual_transaction_id}
                        </div>
                      )}
                      {request.manual_receipt_url && (
                        <div className={styles.manualReference}>
                          <strong>Receipt:</strong> <a href={request.manual_receipt_url} target="_blank" rel="noopener noreferrer" className={styles.receiptLink}>View Receipt</a>
                        </div>
                      )}
                      {request.manual_notes && (
                        <div className={styles.manualNotes}>
                          <strong>Manual Notes:</strong> {request.manual_notes}
                        </div>
                      )}
                    </div>
                    <div className={styles.requestMeta}>
                      <p className={styles.amountDisplay}>
                        ₵{parseFloat(request.amount).toFixed(2)}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <span className={`${styles.statusBadge} ${getStatusClass(request.status)}`}>
                        {request.status === 'Pending' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {request.status === 'Approved' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {request.status === 'Rejected' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {request.status === 'Completed' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {request.status}
                      </span>
                      {request.processing_method && (
                        <span className={`${styles.processingMethodBadge} ${request.processing_method === 'paystack' ? styles.methodPaystack : styles.methodManual}`}>
                          {request.processing_method === 'paystack' ? 'Paystack' : 'Manual'}
                        </span>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Processing Modal */}
        {manualModalOpen && (
          <div className={styles.modalOverlay} onClick={closeManualModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>Process Withdrawal Manually</h2>
                <button className={styles.modalClose} onClick={closeManualModal}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.modalDescription}>
                  Enter the details of the manual transfer. At least one reference or transaction ID is required.
                </p>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    External Reference <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g., Bank transfer reference, payment ID"
                    value={manualFormData.manualReference}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualReference: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Transaction ID <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g., Bank transaction ID, confirmation number"
                    value={manualFormData.manualTransactionId}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualTransactionId: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Receipt URL (Optional)
                  </label>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://example.com/receipt.pdf"
                    value={manualFormData.manualReceiptUrl}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualReceiptUrl: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Notes (Optional)
                  </label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="Additional notes about the manual transfer..."
                    rows="4"
                    value={manualFormData.manualNotes}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualNotes: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                  onClick={closeManualModal}
                >
                  Cancel
                </button>
                <button
                  className={`${styles.modalButton} ${styles.modalButtonSubmit}`}
                  onClick={() => {
                    const request = requests.find(r => r.id === manualModalOpen);
                    if (request) {
                      handleManualApprove(request.id, request.amount, request.user_id);
                    }
                  }}
                  disabled={loading[manualModalOpen] || (!manualFormData.manualReference && !manualFormData.manualTransactionId)}
                >
                  {loading[manualModalOpen] ? 'Processing...' : 'Complete Manual Withdrawal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 && !error && (
          <div className={styles.emptyState}>
            <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className={styles.emptyStateTitle}>No withdrawal requests found</div>
            <div className={styles.emptyStateText}>
              {stats.total === 0 
                ? "There are no withdrawal requests in the system yet."
                : "All withdrawal requests have been processed."}
            </div>
          </div>
        )}
    </div>
  );
}
