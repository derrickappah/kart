'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useId } from 'react';

export default function RefundRequestModal({ orderId, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState('Item not received');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const reasonId = useId();
  const descriptionId = useId();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/orders/request-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          reason,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit refund request');
      }

      onSuccess('Refund request submitted successfully!');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reasons = [
    'Item not received',
    'Item significantly not as described',
    'Order cancelled by seller',
    'Duplicate charge',
    'Other'
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0f11]/90 backdrop-blur-md"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      ></div>

      <div className="relative bg-white dark:bg-[#182125] w-full max-w-md rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 id={titleId} className="text-xl font-black tracking-tighter">Request Refund</h2>
            <button
              onClick={onClose}
              aria-label="Close refund request dialog"
              className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            >
              <DynamicLucideIcon name="close" className="text-xl" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3" role="alert">
              <DynamicLucideIcon name="error" className="text-red-500" />
              <p className="text-xs font-bold text-red-500 uppercase tracking-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <label
                htmlFor={reasonId}
                className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]"
              >
                Primary Reason
              </label>
              <select
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-2xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                required
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor={descriptionId}
                className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]"
              >
                Details <span className="font-normal normal-case tracking-normal opacity-60">(Optional)</span>
              </label>
              <textarea
                id={descriptionId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened..."
                className="w-full bg-background-light dark:bg-[#212b30] border border-[#dce3e5] dark:border-[#2d3b41] rounded-2xl px-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px] resize-none"
              />
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:bg-gray-50 dark:hover:bg-[#212b30] rounded-xl transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                aria-label={loading ? 'Submitting refund request' : 'Submit refund request'}
                className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-primary shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
