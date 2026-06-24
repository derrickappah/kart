'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RefundRequestsClient({ initialRequests }) {
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const router = useRouter();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // BUG-06: Pass the requestId to the API so it can update refund_requests.status
  // alongside the order. Previously only orderId was passed, leaving refund_requests.status as 'Pending'.
  const handleRefund = async (requestId, orderId) => {
    if (!confirm('Are you sure you want to approve this refund? This will credit the buyer\'s wallet and cannot be undone.')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, requestId, reason: 'Approved buyer refund request' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process refund');
      }

      showToast('Refund processed successfully!');
      // BUG-06: Match by request.id (not order_id) to correctly identify the specific request
      setRequests(requests.map(r => 
        r.id === requestId ? { ...r, status: 'Approved' } : r
      ));
      router.refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/refund-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      showToast('Request rejected');
      setRequests(requests.map(r => 
        r.id === requestId ? { ...r, status: 'Rejected' } : r
      ));
      router.refresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[800px] md:min-w-0">
            <thead>
              <tr className="border-b border-[#dce3e5] dark:border-[#2d3b41] bg-[#f9fafb]/50 dark:bg-[#131d21]/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Order / Product</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Buyer</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Reason</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-sm font-bold text-gray-500 uppercase tracking-widest">
                    No refund requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50/50 dark:hover:bg-[#212b30]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link href={`/dashboard/admin/orders/${request.order_id}`} className="text-xs font-black text-primary hover:underline">
                          #{request.order_id.slice(0, 8).toUpperCase()}
                        </Link>
                        <span className="text-[10px] font-bold text-gray-500 truncate max-w-[150px]">
                          {request.order?.product?.title || 'Unknown Product'}
                        </span>
                        <span className="text-[10px] font-black text-primary mt-1">
                          ₵{parseFloat(request.order?.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{request.buyer?.display_name || 'User'}</span>
                        <span className="text-[9px] font-bold text-gray-500 truncate max-w-[120px]">{request.buyer?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-[10px] font-black uppercase text-amber-600">{request.reason}</span>
                        <span className="text-[10px] font-medium text-gray-500 truncate">{request.description || 'No details provided'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        request.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500' :
                        request.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500' :
                        'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {request.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={loading}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            title="Reject Request"
                          >
                            <DynamicLucideIcon name="close" className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleRefund(request.id, request.order_id)}
                            disabled={loading}
                            className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            title="Approve Refund"
                          >
                            <DynamicLucideIcon name="check" className="text-sm" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] font-black text-gray-400 uppercase">Resolved</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Toast */}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl`}>
            <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : 'error'} className="text-sm" />
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
