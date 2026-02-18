'use client';
import { useState } from 'react';

export default function DeleteAccountModal({ isOpen, onClose, onSuccess }) {
    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isConfirmValid = confirmText === 'DELETE';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isConfirmValid) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/account/request-deletion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: reason.trim() || null }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit deletion request');
            }

            // Success - call the onSuccess callback
            onSuccess(data.request);

            // Reset form
            setConfirmText('');
            setReason('');

            // Close modal
            onClose();
        } catch (err) {
            console.error('Deletion request error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return; // Prevent closing while loading
        setConfirmText('');
        setReason('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-12 rounded-full bg-red-100 dark:bg-red-900/20">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Account Deletion</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Warning Message */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl shrink-0">info</span>
                            <div className="space-y-2 text-sm text-red-900 dark:text-red-200">
                                <p className="font-semibold">Your deletion request will be reviewed by our team.</p>
                                <ul className="list-disc list-inside space-y-1 text-red-800 dark:text-red-300">
                                    <li>All your data will be permanently deleted</li>
                                    <li>Your products and orders will be removed</li>
                                    <li>This action cannot be reversed</li>
                                    <li>Processing may take up to 30 days</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Reason (Optional) */}
                    <div className="space-y-2">
                        <label htmlFor="reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Reason for deletion (optional)
                        </label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Help us improve by sharing why you're leaving..."
                            className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                            rows="3"
                            disabled={loading}
                        />
                    </div>

                    {/* Confirmation Input */}
                    <div className="space-y-2">
                        <label htmlFor="confirm" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
                        </label>
                        <input
                            id="confirm"
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                            disabled={loading}
                            autoComplete="off"
                        />
                        {confirmText && !isConfirmValid && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                Please type exactly "DELETE" in capital letters
                            </p>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isConfirmValid || loading}
                            className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/25"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                    Submitting...
                                </span>
                            ) : (
                                'Confirm Deletion'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
