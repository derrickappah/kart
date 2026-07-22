'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';

export default function DeliveryVerificationModal({ isOpen, onClose, onVerify, loading, error }) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const inputs = useRef([]);
    const modalRef = useRef(null);
    const titleId = useId();

    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
        }
    }

    useEffect(() => {
        if (!isOpen) return;

        // Focus first input after modal opens
        const focusTimer = setTimeout(() => inputs.current[0]?.focus(), 100);

        // Escape key and focus trap handler
        const handleKeyDownGlobal = (e) => {
            if (e.key === 'Escape' && !loading) {
                onClose();
                return;
            }

            if (e.key === 'Tab' && modalRef.current) {
                const focusables = modalRef.current.querySelectorAll(
                    'button:not([disabled]), input:not([disabled]), a[href]:not([disabled])'
                );
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDownGlobal);
        return () => {
            clearTimeout(focusTimer);
            window.removeEventListener('keydown', handleKeyDownGlobal);
        };
    }, [isOpen, loading, onClose]);

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
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            inputs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            e.preventDefault();
            inputs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        pasteData.forEach((char, i) => {
            if (/^\d$/.test(char)) newOtp[i] = char;
        });
        setOtp(newOtp);
        const nextIndex = Math.min(pasteData.length, 5);
        inputs.current[nextIndex]?.focus();
        // Auto-submit if all 6 digits were pasted
        if (pasteData.length === 6 && pasteData.every(d => /^\d$/.test(d))) {
            onVerify(pasteData.join(''));
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-[#1e292b] rounded-[32px] shadow-2xl max-w-sm w-full p-6 sm:p-8 space-y-8 animate-in zoom-in-95 duration-300 border border-white/10 relative"
            >
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        <DynamicLucideIcon name="lock" className="text-3xl" />
                    </div>
                    <h2 id={titleId} className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enter Delivery PIN</h2>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                        Enter your 6-digit security PIN to confirm receipt <br />
                        and release escrow funds to the seller.
                    </p>
                </div>

                {/* PIN Inputs */}
                <div className="space-y-6">
                    <div
                        className="flex justify-between gap-1 sm:gap-2"
                        role="group"
                        aria-label="6-digit delivery PIN"
                    >
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputs.current[index] = el}
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                aria-label={`Digit ${index + 1} of 6`}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="size-10 sm:size-12 text-center text-lg sm:text-xl font-black bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-xl shadow-inner outline-none transition-all dark:text-white focus-visible:ring-2 focus-visible:ring-primary"
                                placeholder="•"
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 animate-in slide-in-from-top-2" role="alert">
                            <DynamicLucideIcon name="error" className="text-red-500 text-lg shrink-0" />
                            <p className="text-red-500 text-[11px] font-bold uppercase tracking-wider leading-tight">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={() => onVerify(otp.join(''))}
                        disabled={loading || otp.some(d => !d)}
                        className="w-full h-14 bg-gradient-to-r from-primary to-[#42B883] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        {loading ? (
                            <>
                                <DynamicLucideIcon name="refresh" className="animate-spin" />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <DynamicLucideIcon name="verified" />
                                <span>Verify Delivery PIN</span>
                            </>
                        )}
                    </button>
                    
                    <div className="text-center pt-2">
                        <Link
                            href="/dashboard/settings/security/delivery-pin"
                            className="text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors focus-visible:underline"
                        >
                            Forgot PIN? Reset in Settings
                        </Link>
                    </div>
                </div>
                
                <button
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close delivery PIN dialog"
                    className="absolute top-4 right-4 size-8 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <DynamicLucideIcon name="close" className="text-xl" />
                </button>
            </div>
        </div>
    );
}

