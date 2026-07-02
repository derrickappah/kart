'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useId } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DeliveryPinPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromOrder = searchParams.get('fromOrder');

    const [hasPin, setHasPin] = useState(false);
    const [fetchingStatus, setFetchingStatus] = useState(true);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [showCurrentPin, setShowCurrentPin] = useState(false);
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const currentPinId = useId();
    const newPinId = useId();
    const confirmPinId = useId();

    useEffect(() => {
        const fetchPinStatus = async () => {
            try {
                const response = await fetch('/api/settings/delivery-pin/status');
                const data = await response.json();
                if (response.ok) {
                    setHasPin(data.hasPin);
                }
            } catch (err) {
                console.error('Error fetching PIN status:', err);
            } finally {
                setFetchingStatus(false);
            }
        };
        fetchPinStatus();
    }, []);

    const handlePinInput = (value, setter) => {
        // Enforce only digits and maximum 6 characters
        const cleaned = value.replace(/\D/g, '').slice(0, 6);
        setter(cleaned);
    };

    const handleSavePin = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (newPin.length !== 6) {
            setMessage({ type: 'error', text: 'PIN must be exactly 6 digits.' });
            return;
        }

        if (newPin !== confirmPin) {
            setMessage({ type: 'error', text: 'New PIN and Confirm PIN do not match.' });
            return;
        }

        if (hasPin && !currentPin) {
            setMessage({ type: 'error', text: 'Please enter your current PIN.' });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/settings/delivery-pin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPin: hasPin ? currentPin : undefined,
                    newPin
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save delivery PIN');
            }

            setMessage({ type: 'success', text: data.message || 'Delivery PIN saved successfully!' });
            
            // Clear inputs
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
            setHasPin(true);

            // Redirect back to order if page parameter matches
            setTimeout(() => {
                if (fromOrder) {
                    router.push(`/dashboard/orders/${fromOrder}`);
                } else {
                    router.back();
                }
            }, 1500);

        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased">
            <header className="px-4 pt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()} 
                        aria-label="Go back"
                        className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E292B] shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="arrow_back" />
                    </button>
                    <h1 className="text-xl font-bold">{hasPin ? 'Change Delivery PIN' : 'Set Delivery PIN'}</h1>
                </div>
                {fromOrder && (
                    <Link
                        href={`/dashboard/orders/${fromOrder}`}
                        className="text-xs font-bold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Back to Order
                    </Link>
                )}
            </header>

            <main className="flex-1 px-4 pt-8 max-w-md w-full mx-auto">
                <div className="bg-white dark:bg-[#1E292B] rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800/50">
                    <div className="mb-6 flex gap-3 bg-[#e9f7fb] dark:bg-[#1daddd]/10 p-4 rounded-2xl border border-[#1daddd]/20">
                        <DynamicLucideIcon name="security" className="text-[#1daddd] shrink-0 text-xl" />
                        <p className="text-[#4f8596] dark:text-[#1daddd]/90 text-xs leading-normal font-medium">
                            <span className="font-bold">Security Note:</span> Your Delivery PIN is used to verify item handovers. Keep it secure and never share it with anyone.
                        </p>
                    </div>

                    {fetchingStatus ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-semibold text-slate-400">Loading PIN configuration...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSavePin} className="space-y-6" noValidate>
                            {hasPin && (
                                <div className="space-y-2">
                                    <label htmlFor={currentPinId} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Current PIN
                                    </label>
                                    <div className="relative">
                                        <input
                                            id={currentPinId}
                                            type={showCurrentPin ? 'text' : 'password'}
                                            inputMode="numeric"
                                            value={currentPin}
                                            onChange={(e) => handlePinInput(e.target.value, setCurrentPin)}
                                            placeholder="••••••"
                                            required
                                            className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-widest text-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPin(!showCurrentPin)}
                                            aria-label={showCurrentPin ? 'Hide current PIN' : 'Show current PIN'}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                        >
                                            <DynamicLucideIcon name={showCurrentPin ? 'visibility_off' : 'visibility'} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor={newPinId} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    {hasPin ? 'New 6-Digit PIN' : 'Choose a 6-Digit PIN'}
                                </label>
                                <div className="relative">
                                    <input
                                        id={newPinId}
                                        type={showNewPin ? 'text' : 'password'}
                                        inputMode="numeric"
                                        value={newPin}
                                        onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                                        placeholder="••••••"
                                        required
                                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-widest text-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPin(!showNewPin)}
                                        aria-label={showNewPin ? 'Hide new PIN' : 'Show new PIN'}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                    >
                                        <DynamicLucideIcon name={showNewPin ? 'visibility_off' : 'visibility'} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor={confirmPinId} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Confirm New PIN
                                </label>
                                <div className="relative">
                                    <input
                                        id={confirmPinId}
                                        type={showConfirmPin ? 'text' : 'password'}
                                        inputMode="numeric"
                                        value={confirmPin}
                                        onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                                        placeholder="••••••"
                                        required
                                        className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-transparent rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono tracking-widest text-lg"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                                        aria-label={showConfirmPin ? 'Hide confirm PIN' : 'Show confirm PIN'}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                    >
                                        <DynamicLucideIcon name={showConfirmPin ? 'visibility_off' : 'visibility'} />
                                    </button>
                                </div>
                            </div>

                            {message && (
                                <div 
                                    role="alert"
                                    className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                                        message.type === 'error' 
                                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30' 
                                            : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-900/30'
                                    }`}
                                >
                                    <DynamicLucideIcon name={message.type === 'error' ? 'error' : 'check_circle'} className="shrink-0 text-lg" />
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || newPin.length !== 6 || confirmPin.length !== 6 || (hasPin && currentPin.length !== 6)}
                                className="w-full h-14 bg-gradient-to-r from-primary to-[#42B883] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                {loading ? (
                                    <>
                                        <DynamicLucideIcon name="refresh" className="animate-spin" />
                                        <span>Saving PIN...</span>
                                    </>
                                ) : (
                                    <>
                                        <DynamicLucideIcon name="verified" />
                                        <span>{hasPin ? 'Update PIN' : 'Save PIN'}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
