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


  return (
    <div className="space-y-8">
      {/* Financial Stats Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Pending Payouts', value: stats.pending, color: 'primary', icon: 'pending_actions', sub: `GH₵ ${stats.pendingAmount?.toFixed(2)} volume` },
          { label: 'Completed Transfers', value: stats.completed, color: 'green-500', icon: 'check_circle', sub: 'Successfully processed' },
          { label: 'Total Volume', value: `GH₵ ${stats.totalAmount?.toFixed(2)}`, color: 'amber-500', icon: 'payments', sub: `${stats.total} total requests` },
          { label: 'In Queue', value: stats.total - stats.completed - stats.rejected, color: 'blue-500', icon: 'account_balance_wallet', sub: 'Awaiting settlement' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                  stat.color === 'amber-500' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-blue-500/10 text-blue-500'
                }`}>
                <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                <p className="text-xl font-black tracking-tighter">{stat.value}</p>
              </div>
            </div>
            <div className="h-1 w-full bg-gray-100 dark:bg-[#212b30] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${stat.color === 'primary' ? 'bg-primary' :
                stat.color === 'green-500' ? 'bg-green-500' :
                  stat.color === 'amber-500' ? 'bg-amber-500' :
                    'bg-blue-500'
                }`} style={{ width: '65%' }}></div>
            </div>
            <p className="text-[10px] text-[#4b636c] font-black mt-3 uppercase tracking-widest">{stat.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium flex items-center gap-3 animate-shake">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-500 text-sm font-medium flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined">verified_user</span>
          {success}
        </div>
      )}

      {/* Withdrawal Inventory */}
      <div className="space-y-12">
        {/* Pending Payout Queue */}
        {pendingRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="size-2 bg-amber-500 rounded-full animate-pulse"></div>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#4b636c]">Execute Payout Queue</h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-black">{pendingRequests.length} Operations Pending</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {pendingRequests.map((request) => {
                const paymentMethod = getPaymentMethod(request);
                return (
                  <div key={request.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden group hover:border-primary/30 transition-all flex flex-col md:flex-row shadow-sm">
                    <div className="w-full md:w-48 bg-background-light dark:bg-[#212b30] p-6 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-[#dce3e5] dark:border-[#2d3b41]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Disbursement Val</p>
                      <p className="text-3xl font-black text-primary tracking-tighter">GH₵ {parseFloat(request.amount).toFixed(2)}</p>
                      <div className="mt-4 flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${paymentMethod?.type === 'bank' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[#1daddd] text-white shadow-lg shadow-[#1daddd]/20'
                          }`}>
                          {paymentMethod?.type?.replace('_', ' ') || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-black tracking-tight text-[#111618] dark:text-white uppercase">{request.user?.display_name || 'Anonymous User'}</h3>
                            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter">{request.user?.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-[#4b636c] mb-1 group-hover:text-primary transition-colors">Available Funds</p>
                            <p className="text-sm font-black text-green-600 tracking-tighter">GH₵ {parseFloat(request.wallet?.balance || 0).toFixed(2)}</p>
                          </div>
                        </div>

                        {paymentMethod ? (
                          <div className="bg-white/50 dark:bg-[#212b30]/50 rounded-xl p-4 border border-[#dce3e5]/50 dark:border-[#2d3b41]/50 space-y-2">
                            {paymentMethod.type === 'bank' ? (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Account</span>
                                  <span className="font-black truncate">{paymentMethod.details.account_number}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Bank</span>
                                  <span className="font-black uppercase">{paymentMethod.details.bank_code}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Recipient</span>
                                  <span className="font-black uppercase truncate max-w-[150px]">{paymentMethod.details.account_name}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Mobile</span>
                                  <span className="font-black">{paymentMethod.details.number}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Network</span>
                                  <span className="font-black uppercase">{paymentMethod.details.network}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-[#4b636c] font-black uppercase tracking-widest text-[9px]">Name</span>
                                  <span className="font-black uppercase truncate max-w-[150px]">{paymentMethod.details.name}</span>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-500 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            Incomplete Payout Information
                          </div>
                        )}

                        {hasPaystackError(request) && (
                          <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-[10px] text-red-500 font-bold flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]">report</span>
                              {request.admin_notes}
                            </div>
                            {request.paystack_retry_count > 0 && (
                              <span className="opacity-60">Paystack Retries: {request.paystack_retry_count}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between gap-4">
                        <div className="text-[9px] font-black text-[#4b636c] uppercase tracking-widest">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasPaystackError(request) ? (
                            <>
                              <button
                                onClick={() => handleRetryPaystack(request.id, request.amount, request.user_id)}
                                disabled={loading[request.id]}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">refresh</span>
                                {loading[request.id] ? 'Retrying...' : 'Retry automated'}
                              </button>
                              <button
                                onClick={() => openManualModal(request.id)}
                                disabled={loading[request.id]}
                                className="px-4 py-2 rounded-xl bg-[#111618] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">account_balance</span>
                                {loading[request.id] ? 'Wait...' : 'Manual Payout'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApprove(request.id, request.amount, request.user_id)}
                                disabled={loading[request.id]}
                                className="px-5 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                                {loading[request.id] ? 'Processing...' : 'Authorize Payout'}
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={loading[request.id]}
                                className="px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                                title="Reject Request"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Historical Records */}
        {otherRequests.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#4b636c]">Settlement Archive</h2>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#212b30] text-[#4b636c] text-[10px] font-black">{otherRequests.length} Finalized</span>
            </div>

            <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-background-light dark:bg-[#212b30]/50 border-b border-[#dce3e5] dark:border-[#2d3b41]">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Payee Identity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Quantum</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#4b636c] uppercase tracking-widest">Disposition</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#4b636c] uppercase tracking-widest text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
                  {otherRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                            {request.user?.display_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-black tracking-tighter text-[#111618] dark:text-gray-200 uppercase">{request.user?.display_name || 'Anonymous'}</p>
                            <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest">{request.processing_method || 'Internal'} Settlement</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black">GH₵ {parseFloat(request.amount).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${request.status === 'Approved' || request.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                          request.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[10px] font-black text-[#4b636c] uppercase tracking-widest">{new Date(request.updated_at || request.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Manual Processing Modal */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0f11]/80 backdrop-blur-sm" onClick={closeManualModal}></div>
          <div className="relative bg-white dark:bg-[#182125] w-full max-w-xl rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tighter">Manual Settlement override</h2>
                <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-[0.2em] mt-1">Order Protocol Override</p>
              </div>
              <button onClick={closeManualModal} className="size-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#212b30] flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b636c]">External Reference</label>
                  <input
                    type="text"
                    className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase placeholder:text-[#4b636c]"
                    placeholder="Bank Ref#"
                    value={manualFormData.manualReference}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualReference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b636c]">Transaction ID</label>
                  <input
                    type="text"
                    className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all uppercase placeholder:text-[#4b636c]"
                    placeholder="Network ID#"
                    value={manualFormData.manualTransactionId}
                    onChange={(e) => setManualFormData({ ...manualFormData, manualTransactionId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b636c]">Proof of Transfer (URL)</label>
                <input
                  type="url"
                  className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-[#4b636c]"
                  placeholder="https://cloud.receipt.pdf"
                  value={manualFormData.manualReceiptUrl}
                  onChange={(e) => setManualFormData({ ...manualFormData, manualReceiptUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b636c]">Audit Notes</label>
                <textarea
                  className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-xl px-4 py-3 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-[#4b636c]"
                  placeholder="Describe the manual verification steps taken..."
                  rows="3"
                  value={manualFormData.manualNotes}
                  onChange={(e) => setManualFormData({ ...manualFormData, manualNotes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-8 bg-background-light dark:bg-[#212b30]/50 flex items-center justify-between gap-4">
              <button onClick={closeManualModal} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-red-500 transition-colors">
                Discard
              </button>
              <button
                onClick={() => {
                  const request = requests.find(r => r.id === manualModalOpen);
                  if (request) handleManualApprove(request.id, request.amount, request.user_id);
                }}
                disabled={loading[manualModalOpen] || (!manualFormData.manualReference && !manualFormData.manualTransactionId)}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading[manualModalOpen] ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                )}
                Finalize Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 && !error && (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
            <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">account_balance_wallet</span>
          </div>
          <h3 className="text-xl font-black tracking-tighter">Ledger Operational</h3>
          <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">
            {stats.total === 0
              ? "No withdrawal requests have been initiated on the platform yet."
              : "Outstanding payout requests have been successfully cleared."}
          </p>
        </div>
      )}
    </div>
  );
}
