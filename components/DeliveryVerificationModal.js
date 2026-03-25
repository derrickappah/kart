'use client';
import { useState, useEffect, useRef } from 'react';

export default function DeliveryVerificationModal({ isOpen, onClose, onVerify, onResend, email, loading, error }) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(0);
    const inputs = useRef([]);

    useEffect(() => {
        if (isOpen) {
            setTimer(60); // 60 seconds resend timer
            setOtp(['', '', '', '', '', '']);
            // Focus first input after a short delay to allow modal animation
            setTimeout(() => inputs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (timer > 0) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer]);

    const handleChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // If all digits are entered, auto-submit
        if (value && index === 5 && newOtp.every(d => d !== '')) {
            onVerify(newOtp.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').slice(0, 6).split('');
        const newOtp = [...otp];
        pasteData.forEach((char, i) => {
            if (/^\d$/.test(char)) newOtp[i] = char;
        });
        setOtp(newOtp);
        if (pasteData.length > 0) {
            const nextIndex = Math.min(pasteData.length, 5);
            inputs.current[nextIndex]?.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1e292b] rounded-[32px] shadow-2xl max-w-sm w-full p-8 space-y-8 animate-in zoom-in-95 duration-300 border border-white/10">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Verify Delivery</h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        We've sent a 6-digit verification code to <br />
                        <span className="font-bold text-slate-900 dark:text-white">{email}</span>
                    </p>
                </div>

                {/* OTP Inputs */}
                <div className="space-y-6">
                    <div className="flex justify-between gap-2">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="size-11 sm:size-12 text-center text-xl font-black bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-xl shadow-inner outline-none transition-all dark:text-white"
                                placeholder="•"
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-in slide-in-from-top-2">
                            <span className="material-symbols-outlined text-red-500 text-lg shrink-0">error</span>
                            <p className="text-red-500 text-[11px] font-bold uppercase tracking-wider leading-tight">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={() => onVerify(otp.join(''))}
                        disabled={loading || otp.some(d => !d)}
                        className="w-full h-14 bg-gradient-to-r from-primary to-[#42B883] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">refresh</span>
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">verified</span>
                                <span>Confirm Delivery</span>
                            </>
                        )}
                    </button>
                    
                    <div className="text-center pt-2">
                        {timer > 0 ? (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Resend code in {timer}s
                            </p>
                        ) : (
                            <button
                                onClick={onResend}
                                disabled={loading}
                                className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
                            >
                                Didn't receive code? Resend
                            </button>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    disabled={loading}
                    className="absolute top-4 right-4 size-8 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
        </div>
    );
}
