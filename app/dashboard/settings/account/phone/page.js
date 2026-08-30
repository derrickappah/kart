'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { formatToInternationalPhone, formatPhoneDisplay } from '@/utils/phoneUtils';

export default function PhoneUpdatePage() {
    const router = useRouter();
    const supabase = createClient();

    const [currentPhone, setCurrentPhone] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [newPhone, setNewPhone] = useState('');

    const [step, setStep] = useState('input'); // 'input' | 'otp'
    const [otp, setOtp] = useState(['', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        let mounted = true;

        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('phone, phone_verified')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (error) throw error;

                    if (mounted && data) {
                        const std = data.phone ? formatToInternationalPhone(data.phone) : '';
                        setCurrentPhone(std);
                        setIsVerified(Boolean(data.phone_verified));
                        setNewPhone(std);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                if (mounted) {
                    setMessage({ type: 'error', text: 'Failed to load profile data.' });
                }
            } finally {
                if (mounted) {
                    setInitialLoading(false);
                }
            }
        };

        getProfile();

        return () => {
            mounted = false;
        };
    }, [supabase]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        setMessage(null);

        if (!newPhone) {
            setMessage({ type: 'error', text: 'Please enter a valid phone number.' });
            return;
        }

        const standardPhone = formatToInternationalPhone(newPhone);
        if (!standardPhone || !isValidPhoneNumber(standardPhone)) {
            setMessage({ type: 'error', text: 'Please enter a valid international phone format.' });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/send-phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: standardPhone }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage({ type: 'error', text: data.error || 'Failed to send verification code' });
            } else {
                setStep('otp');
                setOtp(['', '', '', '', '']);
                setResendCooldown(60);
                setMessage({
                    type: 'success',
                    text: 'A 5-digit verification code has been sent via SMS.'
                });
                if (data.otp) {
                    console.log('[Development OTP]:', data.otp);
                }
            }
        } catch (err) {
            console.error('Send OTP error:', err);
            setMessage({ type: 'error', text: 'Failed to connect to SMS service. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        // Handle pasted string
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 5).split('');
            if (digits.length > 0) {
                const updated = [...otp];
                digits.forEach((d, i) => {
                    if (index + i < 5) updated[index + i] = d;
                });
                setOtp(updated);
                const nextIndex = Math.min(index + digits.length, 4);
                document.getElementById(`otp-${nextIndex}`)?.focus();
                return;
            }
        }

        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

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

    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        setMessage(null);

        const code = otp.join('');
        if (code.length < 5) {
            setMessage({ type: 'error', text: 'Please enter the complete 5-digit code.' });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp: code }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage({ type: 'error', text: data.error || 'Invalid verification code' });
            } else {
                const verifiedNumber = formatToInternationalPhone(data.phone || newPhone);
                setCurrentPhone(verifiedNumber);
                setIsVerified(true);
                setMessage({ type: 'success', text: 'Phone number verified successfully!' });
                setTimeout(() => {
                    router.back();
                }, 1500);
            }
        } catch (err) {
            console.error('Verify OTP error:', err);
            setMessage({ type: 'error', text: 'Failed to verify code. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#242428] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            {/* Header */}
            <header className="px-4 pt-6 flex items-center gap-4">
                <button
                    onClick={() => {
                        if (step === 'otp') {
                            setStep('input');
                            setMessage(null);
                        } else {
                            router.back();
                        }
                    }}
                    className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                    <DynamicLucideIcon name="arrow_back" />
                </button>
                <h1 className="text-xl font-bold">
                    {step === 'otp' ? 'Verify Phone Number' : 'Phone Settings'}
                </h1>
            </header>

            <main className="flex-1 px-4 pt-6 max-w-lg mx-auto w-full">
                <div className="bg-white dark:bg-[#1E292B] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                    {initialLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : step === 'input' ? (
                        /* STEP 1: Phone Input & Verification Trigger */
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            {/* Current Phone Status */}
                            {currentPhone && (
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            Current Number
                                        </span>
                                        <span className="text-base font-semibold font-mono text-slate-900 dark:text-white mt-0.5">
                                            {formatPhoneDisplay(currentPhone) || currentPhone}
                                        </span>
                                    </div>
                                    <div>
                                        {isVerified ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <DynamicLucideIcon name="verified" className="text-sm" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                <DynamicLucideIcon name="warning" className="text-sm" />
                                                Unverified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Phone Input */}
                            <div className="space-y-2">
                                <label htmlFor="phone-input" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    {currentPhone ? 'Update Phone Number' : 'Add Phone Number'}
                                </label>
                                <div className="phone-input-container">
                                    <PhoneInput
                                        id="phone-input"
                                        international
                                        defaultCountry="GH"
                                        value={newPhone}
                                        onChange={setNewPhone}
                                        className="w-full p-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700/60 rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent outline-none transition-all font-mono text-slate-900 dark:text-white"
                                        numberInputProps={{
                                            className: "w-full bg-transparent border-none outline-none focus:ring-0 p-0 ml-2 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base",
                                            placeholder: "Enter phone number",
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                    A 5-digit verification SMS will be sent via Moolre SMS to verify this number.
                                </p>
                            </div>

                            {/* Message Banner */}
                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-medium ${
                                    message.type === 'error'
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                        : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !newPhone || (isVerified && newPhone === currentPhone)}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Sending Code...</span>
                                    </>
                                ) : isVerified && newPhone === currentPhone ? (
                                    'Number Already Verified'
                                ) : (
                                    'Send Verification Code'
                                )}
                            </button>
                        </form>
                    ) : (
                        /* STEP 2: OTP Verification Step */
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Icon */}
                            <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                                <DynamicLucideIcon name="smartphone" className="text-3xl" />
                            </div>

                            {/* Instructions */}
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Enter Verification Code
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    We sent a 5-digit code to <strong className="font-mono text-slate-800 dark:text-slate-200">{newPhone}</strong>
                                </p>
                            </div>

                            {/* OTP Inputs */}
                            <div className="flex justify-center gap-2.5 my-6">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="size-12 sm:size-14 text-center text-2xl font-black bg-slate-50 dark:bg-[#242428] border-2 border-slate-200 dark:border-slate-700/60 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-xl outline-none transition-all dark:text-white"
                                        placeholder=""
                                    />
                                ))}
                            </div>

                            {/* Message Banner */}
                            {message && (
                                <div className={`p-4 rounded-xl text-sm font-medium ${
                                    message.type === 'error'
                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                                        : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleVerifyOtp}
                                    disabled={loading || otp.some((d) => !d)}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        'Verify & Save'
                                    )}
                                </button>

                                <div className="flex flex-col items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSendOtp()}
                                        disabled={loading || resendCooldown > 0}
                                        className="text-primary hover:text-primary/80 text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {resendCooldown > 0 ? (
                                            <>
                                                Resend code in <span className="tabular-nums font-bold">{resendCooldown}s</span>
                                            </>
                                        ) : (
                                            <>
                                                <DynamicLucideIcon name="refresh" className="text-sm" />
                                                Didn&apos;t receive code? Resend SMS
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStep('input');
                                            setMessage(null);
                                        }}
                                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-wider font-semibold"
                                    >
                                        Change Phone Number
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Information Card */}
                <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex gap-3.5 items-start">
                    <DynamicLucideIcon name="info" className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                        Verifying your phone number enables SMS order updates, delivery notifications, and protects your account.
                    </p>
                </div>
            </main>

            <style jsx global>{`
                .PhoneInputInput {
                    background: transparent;
                    border: none;
                    outline: none;
                }
                .PhoneInputCountry {
                    margin-right: 0.5rem;
                }
            `}</style>
        </div>
    );
}
