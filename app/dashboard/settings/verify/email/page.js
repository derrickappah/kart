'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function EmailVerificationPage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email);
                // Automatically send OTP on load
                sendOtp();
            }
        };
        getEmail();
    }, [supabase]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const sendOtp = async () => {
        if (resendCooldown > 0) return;
        
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/auth/send-verification-otp', {
                method: 'POST'
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Failed to send verification code');
                if (data.otp) {
                    console.log('Development OTP:', data.otp);
                }
            } else {
                setResendCooldown(60); // 60 seconds cooldown
            }
        } catch (err) {
            setError('Failed to connect to verification service');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 4) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleVerify = async (codeOverride) => {
        setLoading(true);
        setError(null);

        const code = codeOverride || otp.join('');
        if (code.length < 5) {
            setError('Please enter the full 5-digit code.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: code })
            });

            const data = await response.json();

            if (response.ok) {
                router.push('/dashboard/settings/verify/id-capture');
            } else {
                setError(data.error || 'Invalid verification code');
            }
        } catch (err) {
            setError('Failed to verify code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f8f9fa] dark:bg-[#0d1517] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen antialiased transition-colors duration-200">
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24">
                <div className="w-full max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Icon Container */}
                    <div className="size-28 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-10 text-primary shadow-sm">
                        <span className="material-symbols-outlined shrink-0" style={{ fontSize: '56px' }}>
                            mark_email_unread
                        </span>
                    </div>

                    {/* Text Content */}
                    <div className="space-y-4 mb-12">
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Check your email
                        </h1>
                        <div className="space-y-1">
                            <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
                                We've sent a 5-digit verification code to
                            </p>
                            <p className="font-bold text-gray-900 dark:text-white text-lg break-all">
                                {email || 'your email'}
                            </p>
                        </div>
                    </div>

                    {/* OTP Inputs */}
                    <div className="flex justify-center gap-3 mb-10">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="size-14 text-center text-3xl font-black bg-white dark:bg-[#1e292b] border-2 border-gray-100 dark:border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none transition-all dark:text-white"
                                placeholder=""
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="mb-8 animate-in fade-in zoom-in duration-300">
                            <p className="text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 px-5 py-3 rounded-2xl inline-flex items-center gap-2 border border-red-100 dark:border-red-950/30">
                                <span className="material-symbols-outlined text-base">error</span>
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="space-y-6 w-full">
                        <button
                            onClick={() => handleVerify()}
                            disabled={loading || otp.some(d => !d)}
                            className="w-full h-16 bg-primary hover:bg-[#1c6475] active:scale-[0.98] transition-all duration-300 text-white font-black text-xl rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:shadow-none"
                        >
                            {loading ? (
                                <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'Verify Account'
                            )}
                        </button>

                        <div className="flex flex-col items-center gap-4">
                            <button 
                                onClick={sendOtp}
                                type="button"
                                disabled={loading || resendCooldown > 0}
                                className="text-[#57858e] dark:text-gray-400 text-sm font-bold hover:text-primary transition-all duration-200 flex items-center gap-2 px-4 py-2 hover:bg-primary/5 rounded-xl disabled:opacity-50"
                            >
                                {resendCooldown > 0 ? (
                                    <>Resend code in <span className="text-primary tabular-nums font-black">{resendCooldown}s</span></>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                        Didn't receive a code? Resend
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => router.push('/dashboard/settings/profile')}
                                className="text-gray-400 dark:text-gray-500 text-xs font-bold hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-widest px-4 py-2"
                            >
                                Change Email Address
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
