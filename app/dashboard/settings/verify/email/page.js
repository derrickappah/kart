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
        <div className="bg-[#f0f4f5] dark:bg-[#0a1214] font-display flex flex-col min-h-screen antialiased transition-colors duration-200 overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]"></div>
            </div>

            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
                <div className="w-full max-w-md">
                    {/* Main Card */}
                    <div className="bg-white/80 dark:bg-[#1a2628]/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none border border-white/20 dark:border-white/5 p-8 md:p-12 text-center animate-in fade-in zoom-in duration-700">
                        
                        {/* Header Section */}
                        <div className="relative inline-block mb-10 text-primary">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-125"></div>
                            <div className="size-24 bg-gradient-to-br from-primary to-[#1c6475] rounded-[30px] flex items-center justify-center relative shadow-lg">
                                <span className="material-symbols-outlined text-white" style={{ fontSize: '48px' }}>
                                    verified_user
                                </span>
                            </div>
                        </div>

                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
                            Verify your email
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-10 leading-snug max-w-[280px] mx-auto">
                            We've sent a special code to <br />
                            <span className="font-bold text-primary block mt-1 break-all">{email || 'your email'}</span>
                        </p>

                        {/* OTP Inputs Group */}
                        <div className="flex justify-between gap-2 md:gap-4 mb-10">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="w-full h-16 md:h-18 text-center text-3xl font-black bg-gray-50 dark:bg-[#253335] border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-[#1e292b] focus:ring-4 focus:ring-primary/10 rounded-2xl outline-none transition-all duration-300 dark:text-white shadow-inner"
                                    placeholder="-"
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className="material-symbols-outlined text-red-500 text-xl">error</span>
                                <p className="text-red-500 text-sm font-semibold">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={() => handleVerify()}
                            disabled={loading || otp.some(d => !d)}
                            className="group w-full h-16 bg-gradient-to-r from-primary to-[#1c6475] hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-300 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:hover:shadow-none shadow-xl shadow-primary/20"
                        >
                            {loading ? (
                                <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Verify Account
                                    <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">
                                        arrow_forward
                                    </span>
                                </>
                            )}
                        </button>

                        <div className="mt-10">
                            <button 
                                onClick={sendOtp}
                                type="button"
                                disabled={loading || resendCooldown > 0}
                                className="text-gray-500 dark:text-gray-400 text-sm font-bold hover:text-primary transition-all duration-200 flex items-center justify-center gap-2 mx-auto decoration-2 underline-offset-4 hover:underline disabled:opacity-50 disabled:no-underline"
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
                        </div>
                    </div>

                    {/* Footer Info */}
                    <p className="mt-8 text-center text-gray-400 dark:text-gray-500 text-sm font-medium">
                        Need help? <a href="#" className="text-primary hover:underline font-bold">Contact Support</a>
                    </p>
                </div>
            </main>
        </div>
    );
}
