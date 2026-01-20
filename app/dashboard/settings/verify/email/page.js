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

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email);
            }
        };
        getEmail();
    }, [supabase]);

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

    const handleVerify = async () => {
        setLoading(true);
        setError(null);

        const code = otp.join('');
        if (code.length < 5) {
            setError('Please enter the full 5-digit code.');
            setLoading(false);
            return;
        }

        // Simulated verification for now - In a real app, you'd check this via a Supabase Edge Function or similar
        // For demonstration, let's say '12345' is the magic code
        setTimeout(() => {
            if (code === '12345') {
                router.push('/dashboard/settings/verify/id-capture');
            } else {
                setError('Invalid verification code. Try "12345" for testing.');
                setLoading(false);
            }
        }, 1500);
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#111d21] font-display text-[#101819] dark:text-gray-100 flex flex-col min-h-screen antialiased transition-colors duration-200">
            <main className="flex-1 flex flex-col items-center px-6 pt-12 pb-32">
                <div className="w-full max-w-sm text-center">
                    <div className="size-48 bg-primary/10 rounded-[48px] flex items-center justify-center mx-auto mb-10 text-primary">
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '120px' }}
                        >
                            mark_email_unread
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Check your email</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-base mb-10 leading-relaxed">
                        We've sent a 5-digit verification code to <br />
                        <span className="font-bold text-gray-900 dark:text-white">{email || 'your email'}</span>
                    </p>

                    {/* OTP Inputs */}
                    <div className="flex justify-center gap-3 mb-8">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                id={`otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="size-14 text-center text-2xl font-bold bg-white dark:bg-[#1e292b] border-2 border-transparent focus:border-primary rounded-xl shadow-sm outline-none transition-all dark:text-white"
                                placeholder="0"
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm font-medium mb-6 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-lg inline-block">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleVerify}
                        disabled={loading || otp.some(d => !d)}
                        className="w-full h-14 bg-primary hover:bg-[#1e6a7a] active:scale-[0.98] transition-all duration-200 text-white font-bold text-lg rounded-xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>

                    <button className="mt-8 text-[#57858e] dark:text-gray-400 text-sm font-bold hover:text-primary transition-colors">
                        Didn't receive a code? Resend
                    </button>
                </div>
            </main>
        </div>
    );
}
