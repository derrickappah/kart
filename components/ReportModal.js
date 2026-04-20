'use client';
import { useState } from 'react';

const REPORT_REASONS = [
    'Scam or fraudulent activity',
    'Abusive or harassing language',
    'Inappropriate profile content',
    'Spam',
    'Other'
];

export default function ReportModal({ isOpen, onClose, reportedUserId, productId, targetName }) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!reason) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/reports/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    reportedUserId,
                    reason,
                    description: description.trim() || null
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to submit report');
                throw new Error(errorMsg);
            }

            setSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            console.error('Report error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setReason('');
        setDescription('');
        setError(null);
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1E292B] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-xl bg-red-50 dark:bg-red-500/10">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">flag</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report {targetName || 'User'}</h2>
                    </div>
                    <button 
                        onClick={handleClose}
                        className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                {success ? (
                    <div className="p-12 flex flex-col items-center text-center space-y-4">
                        <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Report Submitted</h3>
                        <p className="text-slate-500 dark:text-slate-400">Thank you for helping keep our community safe. Our team will review this report shortly.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                Reason for reporting
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {REPORT_REASONS.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setReason(r)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left text-sm font-medium ${
                                            reason === r 
                                            ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400' 
                                            : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-white/5 dark:border-white/5 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                    >
                                        <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                                            reason === r ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                            {reason === r && <div className="size-2 rounded-full bg-red-500" />}
                                        </div>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                                Additional Details (optional)
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Please provide more information to help us understand the issue..."
                                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none text-sm"
                                rows="3"
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl">
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!reason || loading}
                                className="flex-1 py-3.5 px-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/20 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Report'
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
