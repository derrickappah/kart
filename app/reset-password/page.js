'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import { Eye, EyeOff, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
    const router = useRouter();
    const supabase = createClient();

    const [sessionChecking, setSessionChecking] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            try {
                // Ensure the user actually has a valid session (established via callback code exchange)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setHasSession(true);
                } else {
                    setHasSession(false);
                }
            } catch (err) {
                console.error('Session check failed:', err);
                setHasSession(false);
            } finally {
                setSessionChecking(false);
            }
        };

        checkSession();
    }, [supabase]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                setError(updateError.message || 'Failed to reset password. Please try again.');
            } else {
                setSuccess(true);
                // Clean input fields
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (sessionChecking) {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
                <div className="flex flex-col items-center space-y-4">
                    <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-[#4f8596] text-sm font-medium animate-pulse">Securing recovery session...</p>
                </div>
            </main>
        );
    }

    if (!hasSession) {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
                <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-8 font-display">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center">
                        <div className="w-[120px] h-[120px] mb-2 relative">
                            <Image 
                                src="/logo.png" 
                                alt="KART Logo" 
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Invalid Session Card */}
                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center space-y-6 shadow-sm">
                        <div className="size-16 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl flex items-center justify-center">
                            <AlertCircle size={32} />
                        </div>
                        
                        <div className="space-y-2">
                            <h1 className="text-xl font-bold text-[#24282D] dark:text-white">Link Invalid or Expired</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                The password reset session could not be verified. This happens if the recovery link has expired or has already been used.
                             </p>
                        </div>

                        <Link
                            href="/forgot-password"
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (success) {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
                <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-8 font-display">
                    {/* Success Card */}
                    <div className="bg-white dark:bg-[#1E292B] border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center flex flex-col items-center space-y-6 shadow-lg shadow-sky-950/5">
                        <div className="size-16 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-2xl flex items-center justify-center animate-bounce">
                            <CheckCircle2 size={32} />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-[#24282D] dark:text-white">Password Updated</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                Your account password has been reset successfully. You are now logged into your session.
                            </p>
                        </div>

                        <Link
                            href="/marketplace"
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            Go to Marketplace
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
            <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-8 font-display">
                {/* Logo Section */}
                <div className="flex flex-col items-center">
                    <div className="w-[120px] h-[120px] mb-2 relative">
                        <Image 
                            src="/logo.png" 
                            alt="KART Logo" 
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* Headline Text */}
                <div className="text-center">
                    <h1 className="text-[#24282D] dark:text-white text-2xl font-bold leading-tight">Reset Password</h1>
                    <p className="text-[#4f8596] mt-2 text-sm">Please set a secure, new password for your campus account.</p>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                        {error && (
                            <div 
                                role="alert"
                                className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium"
                            >
                                {error}
                            </div>
                        )}

                        {/* New Password Field */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="newPassword" className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">New Password</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                                <Lock className="ml-4 text-[#4f8596] size-[20px] shrink-0" />
                                <input 
                                    id="newPassword"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3 pr-12 outline-none" 
                                    placeholder="••••••••" 
                                    type={showNew ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    disabled={loading}
                                    className="absolute right-4 text-[#4f8596] hover:text-primary transition-colors"
                                    aria-label={showNew ? "Hide password" : "Show password"}
                                >
                                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="confirmPassword" className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Confirm Password</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                                <Lock className="ml-4 text-[#4f8596] size-[20px] shrink-0" />
                                <input 
                                    id="confirmPassword"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3 pr-12 outline-none" 
                                    placeholder="••••••••" 
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    disabled={loading}
                                    className="absolute right-4 text-[#4f8596] hover:text-primary transition-colors"
                                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                                >
                                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4 flex flex-col">
                            <button 
                                type="submit" 
                                disabled={loading || !password || !confirmPassword}
                                className="w-full h-14 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-lg"
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
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
