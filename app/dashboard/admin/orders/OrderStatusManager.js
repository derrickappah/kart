'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function OrderStatusManager({ order }) {
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ open: false, nextStatus: '' });
    const router = useRouter();
    const supabase = createClient();

    const statuses = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Completed', 'Cancelled'];

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const updateStatus = async (newStatus) => {
        setLoading(true);
        try {
            // 1. Get current user for audit trail
            const { data: { user } } = await supabase.auth.getUser();

            // 2. Update order status
            const { error: orderError } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);

            if (orderError) throw orderError;

            // 3. Create audit trail entry
            const { error: historyError } = await supabase
                .from('order_status_history')
                .insert({
                    order_id: order.id,
                    old_status: order.status,
                    new_status: newStatus,
                    changed_by: user.id,
                    notes: `Manual status override by administrator.`
                });

            if (historyError) throw historyError;

            showToast(`Order status updated to ${newStatus}`);
            router.refresh();
        } catch (err) {
            console.error('Update failed:', err.message);
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoading(false);
            setConfirmModal({ open: false, nextStatus: '' });
        }
    };

    return (
        <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                Protocol Override
            </h3>

            <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                    <button
                        key={status}
                        onClick={() => setConfirmModal({ open: true, nextStatus: status })}
                        disabled={loading || order.status === status}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${order.status === status
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-background-light dark:bg-[#212b30] text-[#4b636c] hover:bg-primary/5 border border-[#dce3e5] dark:border-[#2d3b41]'
                            } disabled:opacity-50`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md" onClick={() => !loading && setConfirmModal({ open: false, nextStatus: '' })}></div>
                    <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 text-center space-y-4">
                            <div className="mx-auto size-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">emergency_home</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tighter">Override Order Protocol?</h3>
                            <p className="text-xs text-[#4b636c] font-black uppercase tracking-widest leading-relaxed">
                                You are about to manually transition this order from <span className="text-primary font-black">{order.status}</span> to <span className="text-primary font-black">{confirmModal.nextStatus}</span>. This will be logged in the audit trail.
                            </p>
                        </div>
                        <div className="p-6 bg-background-light dark:bg-[#212b30]/50 flex items-center gap-3">
                            <button
                                onClick={() => setConfirmModal({ open: false, nextStatus: '' })}
                                disabled={loading}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-white dark:hover:bg-[#182125] rounded-xl transition-colors disabled:opacity-50"
                            >
                                Abort
                            </button>
                            <button
                                onClick={() => updateStatus(confirmModal.nextStatus)}
                                disabled={loading}
                                className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 bg-primary shadow-primary/20"
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
        </div>
    );
}
