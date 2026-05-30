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
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
        <DynamicLucideIcon name="history" className="text-[18px]" />
        Refund Requested
      </div>
    );
  }

  if (refundStatus === 'Refunded') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest">
        <DynamicLucideIcon name="check_circle" className="text-[18px]" />
        Refunded
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
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all active:scale-95"
      >
        <DynamicLucideIcon name="keyboard_return" className="text-[18px]" />
        Report Problem / Refund
      </button>

      <RefundRequestModal
        orderId={orderId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      {/* Notification Toast */}
      {toast.show && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`${toast.type === 'success' ? 'bg-primary shadow-primary/20' : 'bg-red-500 shadow-red-500/20'} text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl`}>
            <DynamicLucideIcon name={toast.type === 'success' ? 'check_circle' : 'error'} className="text-sm" />
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
