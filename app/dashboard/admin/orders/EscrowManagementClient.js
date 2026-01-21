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

        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-green-500 text-sm font-medium flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            {success}
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-[#dce3e5] dark:border-[#2d3b41] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-md">
            <p className="text-[11px] text-[#4b636c] font-bold uppercase tracking-widest leading-relaxed">
              <strong className="text-[#111618] dark:text-white">Security Protocol:</strong> Releasing escrow will instantly transfer <span className="text-primary font-black">GH₵ {parseFloat(order.seller_payout_amount || 0).toFixed(2)}</span> to the seller's wallet. This action is <span className="underline decoration-red-500/50">irreversible</span>.
            </p>
          </div>

          {canRelease ? (
            <button
              onClick={handleReleaseEscrow}
              disabled={loading}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Release...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">verified_user</span>
                  Authorize Release
                </>
              )}
            </button>
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
  );
}

