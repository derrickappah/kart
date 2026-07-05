'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';
import { forgotPassword } from '../auth/actions';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ForgotPassword() {
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Honeypot field state to intercept bots
    const [honeypot, setHoneypot] = useState('');

    useEffect(() => {
        // Check for active cooldown on component mount
        const lastSent = localStorage.getItem('last_forgot_password_sent');
        if (lastSent) {
            const timePassed = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000);
            if (timePassed < 60) {
                setCooldown(60 - timePassed);
            }
        }
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => {
            setCooldown(cooldown - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setMessage(null);

        // Honeypot bot protection check
        if (honeypot) {
            // Decoy success to trick simple scraper bots without calling action
            setLoading(true);
            setTimeout(() => {
                setMessage("Password reset link sent to your email.");
                setLoading(false);
            }, 800);
            return;
        }

        const formData = new FormData(e.currentTarget);
        const email = String(formData.get('email') || '').trim();

        // Client-side regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);

        const result = await forgotPassword(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.success) {
            setMessage(result.success);
            setLoading(false);
            // Save timestamp to block spammers for 60s
            localStorage.setItem('last_forgot_password_sent', Date.now().toString());
            setCooldown(60);
        }
    }

    return (
        <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
            <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-8 font-display">
                {/* Logo Section */}
                <div className="flex flex-col items-center space-y-2">
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
                    <h1 className="text-[#24282D] dark:text-white text-2xl font-bold leading-tight">Forgot Password?</h1>
                    <p className="text-[#4f8596] mt-2 text-sm">Enter your email and we&apos;ll send you a link to reset your password.</p>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                        {/* Honeypot field (hidden visually, but accessible to autofill bots) */}
                        <div className="hidden" aria-hidden="true">
                            <label htmlFor="website">Leave this field blank</label>
                            <input
                                id="website"
                                type="text"
                                name="website"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                tabIndex="-1"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div 
                                role="alert" 
                                className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium"
                            >
                                {error}
                            </div>
                        )}

                        {message && (
                            <div 
                                role="status" 
                                className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm text-center font-medium"
                            >
                                {message}
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="email" className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Email Address</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                                <DynamicLucideIcon name="alternate_email" className="ml-4 text-[#4f8596] text-[20px]" />
                                <input 
                                    id="email"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3 outline-none" 
                                    placeholder="e.g. student@campus.edu" 
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-col space-y-4">
                            <button 
                                type="submit" 
                                disabled={loading || cooldown > 0}
                                className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5" />
                                        Sending Link...
                                    </>
                                ) : cooldown > 0 ? (
                                    `Resend in ${cooldown}s`
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                            
                            <div className="flex items-center py-2">
                                <div className="flex-grow h-px bg-[#d0e1e6] dark:bg-gray-700"></div>
                                <span className="px-4 text-[#4f8596] text-xs font-semibold tracking-wider uppercase">or</span>
                                <div className="flex-grow h-px bg-[#d0e1e6] dark:bg-gray-700"></div>
                            </div>

                            <Link 
                                href="/login"
                                className="bg-[#24282D] dark:bg-white/10 hover:bg-[#24282D]/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2"
                            >
                                <DynamicLucideIcon name="arrow_back" className="text-[20px]" />
                                Back to Log In
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Secondary Meta Text / Footer */}
                <footer className="pt-4">
                    <p className="text-[#4f8596] text-sm text-center px-8">
                        Need help? 
                        <Link className="font-semibold underline ml-1" href="/faq">Visit our Help Center</Link>
                    </p>
                </footer>
            </div>
        </main>
    );
}
