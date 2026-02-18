'use client';
import { useState } from 'react';

export default function ManualActivationButton({ subscriptionId, paymentReference, onFailure }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    setMessage(null);
    setShowModal(false);

    try {
      const response = await fetch('/api/subscriptions/manual-activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
          reference: paymentReference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for specific payment failure message (case-insensitive and partial match)
        if (data.error?.toLowerCase().includes('payment not successful') && onFailure) {
          onFailure();
        }
        throw new Error(data.error || 'Failed to activate subscription');
      }

      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Subscription activated successfully! Refreshing...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Activation failed',
        });
      }
    } catch (error) {
      console.error('Manual activation error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to verify payment.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 relative">
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-amber-500/20"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
            Verify & Activate
          </>
        )}
      </button>

      {/* Custom Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-[#1e292b] w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-white/5 animate-in zoom-in-95 fade-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="size-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-amber-500 text-4xl font-bold">handyman</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Manual Activation</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                This will attempt to manually verify your Paystack transaction reference and activate your subscription. Continue?
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleActivate}
                  className="w-full bg-[#1daddd] hover:bg-[#1daddd]/90 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                >
                  Confirm Activation
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-4 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top-2 duration-300 ${message.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          : 'bg-red-500/10 text-red-600 border-red-500/20'
          }`}>
          <span className="material-symbols-outlined text-[18px]">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {message.text}
        </div>
      )}
    </div>
  );
}
