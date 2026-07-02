'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import RefundRequestModal from './RefundRequestModal';
import { useRouter } from 'next/navigation';

export default function RefundButton({ orderId, orderStatus, refundStatus }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const router = useRouter();

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
      if (type === 'success') router.refresh();
    }, 3000);
  };

  if (refundStatus === 'Requested') {
    return (
      <div 
        role="status"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-[10px] font-bold uppercase tracking-wider"
      >
        <DynamicLucideIcon name="history" className="text-sm" />
        <span>Refund Requested</span>
      </div>
    );
  }

  if (refundStatus === 'Refunded') {
    return (
      <div 
        role="status"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold uppercase tracking-wider"
      >
        <DynamicLucideIcon name="check_circle" className="text-sm" />
        <span>Refunded</span>
      </div>
    );
  }

  // Only show for Paid/Shipped/Delivered orders that aren't completed
  const isRefundable = ['Paid', 'Shipped', 'Delivered'].includes(orderStatus);

  if (!isRefundable) return null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Report a problem or request a refund for this order"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
      >
        <DynamicLucideIcon name="error_outline" className="text-sm" />
        <span>Report / Refund</span>
      </button>

      <RefundRequestModal
        orderId={orderId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      {/* Notification Toast */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[11000] animate-in slide-in-from-bottom-5 fade-in duration-300 px-4 w-full max-w-xs"
        >
          <div className={`p-4 rounded-2xl flex items-center gap-3 shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 text-white' 
              : 'bg-red-600 border-red-500 text-white'
          }`}>
            <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : 'error'} className="text-xl shrink-0" />
            <span className="text-xs font-bold leading-normal uppercase tracking-wider">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
