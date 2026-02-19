'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EscrowManagementClient({ order }) {
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const router = useRouter();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleReleaseEscrow = async () => {
    setLoading(true);

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

      showToast('Escrow released successfully!');
      router.refresh();
    } catch (err) {
      showToast(err.message || 'Failed to release escrow', 'error');
    } finally {
      setLoading(false);
      setConfirmModal({ open: false });
    }
  };

  const handleRefund = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          reason: 'Admin initiated refund'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      showToast('Order refunded successfully!');
      router.refresh();
    } catch (err) {
      showToast(err.message || 'Failed to process refund', 'error');
    } finally {
      setLoading(false);
      setConfirmModal({ open: false });
    }
  };

  const canRelease = order.escrow_status === 'Held' && (order.status === 'Paid' || order.status === 'Delivered');

  return (
    <>
      <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden shadow-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`size-14 rounded-2xl flex items-center justify-center ${order.escrow_status === 'Held' ? 'bg-amber-500/10 text-amber-500' :
                order.escrow_status === 'Released' ? 'bg-green-500/10 text-green-500' :
                  'bg-gray-500/10 text-gray-500'
                }`}>
                <span className="material-symbols-outlined text-3xl">
                  {order.escrow_status === 'Held' ? 'lock' :
                    order.escrow_status === 'Released' ? 'lock_open' : 'history_edu'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Financial Protocol</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${order.escrow_status === 'Held' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                    order.escrow_status === 'Released' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' :
                      'bg-gray-500 text-white shadow-lg shadow-gray-500/20'
                    }`}>
                    {order.escrow_status || 'NOT INITIALIZED'}
                  </span>
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Asset Security</h2>
              </div>
            </div>

            <div className="flex flex-col md:items-end">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Escrowed Balance</p>
              <p className="text-3xl font-black text-primary tracking-tighter transition-all">GH₵ {parseFloat(order.seller_payout_amount || 0).toFixed(2)}</p>
              <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest mt-1">Pending verification</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-[#dce3e5] dark:border-[#2d3b41] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-md">
              <p className="text-[11px] text-[#4b636c] font-bold uppercase tracking-widest leading-relaxed">
                <strong className="text-[#111618] dark:text-white">Security Protocol:</strong> Releasing escrow will instantly transfer <span className="text-primary font-black">GH₵ {parseFloat(order.seller_payout_amount || 0).toFixed(2)}</span> to the seller's wallet. This action is <span className="underline decoration-red-500/50">irreversible</span>.
              </p>
            </div>

            {canRelease ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'refund' })}
                  disabled={loading}
                  className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/5 transition-all flex items-center gap-2 border border-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">keyboard_return</span>
                  Issue Refund
                </button>
                <button
                  onClick={() => setConfirmModal({ open: true, type: 'release' })}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">verified_user</span>
                  Authorize Release
                </button>
              </div>
            ) : (
              <div className="px-6 py-3 rounded-xl bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] text-[#4b636c] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">security</span>
                {order.escrow_status === 'Released' ? 'Registry Finalized' :
                  order.escrow_status === 'Refunded' ? 'Funds Reversed' :
                    'Protocol Pending'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Confirmation Protocol */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md" onClick={() => !loading && setConfirmModal({ open: false })}></div>
          <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className={`mx-auto size-16 rounded-2xl ${confirmModal.type === 'refund' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'} flex items-center justify-center`}>
                <span className="material-symbols-outlined text-3xl">
                  {confirmModal.type === 'refund' ? 'keyboard_return' : 'info'}
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tighter">
                {confirmModal.type === 'refund' ? 'Confirm Full Refund?' : 'Authorize Escrow Release?'}
              </h3>
              <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest leading-relaxed">
                {confirmModal.type === 'refund'
                  ? `This will return GH₵ ${parseFloat(order.total_amount || 0).toFixed(2)} to the buyer's wallet. This order will be marked as Refunded.`
                  : `This will finalize the registry transaction and transfer GH₵ ${parseFloat(order.seller_payout_amount || 0).toFixed(2)} to the merchant.`
                }
              </p>
            </div>
            <div className="p-6 bg-background-light dark:bg-[#212b30]/50 flex items-center gap-3">
              <button
                onClick={() => setConfirmModal({ open: false })}
                disabled={loading}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-white dark:hover:bg-[#182125] rounded-xl transition-colors disabled:opacity-50"
              >
                Abort
              </button>
              <button
                onClick={confirmModal.type === 'refund' ? handleRefund : handleReleaseEscrow}
                disabled={loading}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 ${confirmModal.type === 'refund'
                  ? 'bg-red-500 shadow-red-500/20'
                  : 'bg-primary shadow-primary/20'
                  }`}
              >
                {loading ? 'Processing...' : 'Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl`}>
            <span className="material-symbols-outlined text-sm">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
