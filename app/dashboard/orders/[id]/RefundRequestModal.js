'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useId } from 'react';

export default function RefundRequestModal({ orderId, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState('Item not received');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const titleId = useId();
  const reasonId = useId();
  const descriptionId = useId();

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

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
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[10000] overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 cursor-default"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Center Layout Container for Scrollability */}
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Dialog Body */}
        <div className="relative bg-white dark:bg-[#1a2325] w-full max-w-md rounded-[32px] border border-black/5 dark:border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-8">
          <div className="p-6 sm:p-8">
            
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 id={titleId} className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Report & Refund
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  File a dispute to hold escrow and request a refund.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                aria-label="Close refund request dialog"
                className="size-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                <DynamicLucideIcon name="close" className="text-xl" />
              </button>
            </div>

            {/* Warning Note */}
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
              <DynamicLucideIcon name="warning" className="text-amber-500 shrink-0 text-lg mt-0.5" />
              <p className="text-amber-700 dark:text-amber-500/90 text-xs leading-normal font-medium">
                <span className="font-bold">Dispute Process:</span> Submitting this claim will immediately hold escrow funds. Our safety team will review all details and resolve the case.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2" role="alert">
                <DynamicLucideIcon name="error" className="text-red-500 shrink-0" />
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide leading-tight">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Reason Select */}
              <div className="space-y-1.5">
                <label
                  htmlFor={reasonId}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400"
                >
                  Dispute Reason
                </label>
                <div className="relative">
                  <select
                    id={reasonId}
                    value={reason}
                    disabled={loading}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                    }}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-2xl pl-4 pr-10 py-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white cursor-pointer"
                    required
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r} className="dark:bg-[#1a2325]">
                        {r}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                    <DynamicLucideIcon name="expand_more" className="text-lg" />
                  </div>
                </div>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1.5">
                <label
                  htmlFor={descriptionId}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400"
                >
                  Dispute details
                </label>
                <textarea
                  id={descriptionId}
                  value={description}
                  disabled={loading}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail to help us investigate..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-2xl px-4 py-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] max-h-[200px] resize-none text-slate-900 dark:text-white placeholder-slate-400"
                  maxLength={1000}
                  required
                />
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 h-14 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  aria-label={loading ? 'Submitting dispute request' : 'Submit dispute request'}
                  className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 transition-all focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <DynamicLucideIcon name="refresh" className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <DynamicLucideIcon name="gavel" />
                      <span>File Dispute</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
