'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, Loader2 } from 'lucide-react';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/settings/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword: password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: 'error', text: data.error || 'Failed to update password' });
            } else {
                setMessage({ type: 'success', text: 'Password updated successfully!' });
                setCurrentPassword('');
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => router.back(), 1500);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center gap-4">
                <button 
                    onClick={() => router.back()} 
                    className="size-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold">Change Password</h1>
            </header>

            <main className="flex-1 px-4 pt-8 max-w-[500px] w-full mx-auto">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Current Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="currentPassword" className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1">Current Password</label>
                            <div className="relative flex items-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                                <Lock className="ml-4 text-slate-400 size-5 shrink-0" />
                                <input
                                    id="currentPassword"
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    required
                                    disabled={loading}
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 pl-3 pr-12 text-base outline-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    disabled={loading}
                                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    aria-label={showCurrent ? "Hide current password" : "Show current password"}
                                >
                                    {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* New Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1">New Password</label>
                            <div className="relative flex items-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                                <Lock className="ml-4 text-slate-400 size-5 shrink-0" />
                                <input
                                    id="password"
                                    type={showNew ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password (min 6 chars)"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 pl-3 pr-12 text-base outline-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    disabled={loading}
                                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    aria-label={showNew ? "Hide new password" : "Show new password"}
                                >
                                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-500 dark:text-slate-400 px-1">Confirm Password</label>
                            <div className="relative flex items-center bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
                                <Lock className="ml-4 text-slate-400 size-5 shrink-0" />
                                <input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 pl-3 pr-12 text-base outline-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/60"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    disabled={loading}
                                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                                >
                                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {message && (
                            <div 
                                role="alert"
                                className={`p-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    message.type === 'error' 
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                                        : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30'
                                }`}
                            >
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !currentPassword || !password || !confirmPassword}
                            className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin size-5" />
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
