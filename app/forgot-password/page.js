'use client';
import Image from 'next/image';
import Link from 'next/link';
import { forgotPassword } from '../auth/actions';
import { useState } from 'react';

export default function ForgotPassword() {
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData) {
        setLoading(true);
        setError(null);
        setMessage(null);
        const result = await forgotPassword(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.success) {
            setMessage(result.success);
            setLoading(false);
        }
    }

    return (
        <main className="bg-[#f6f7f8] dark:bg-[#111d21] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
            <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-8 font-display">
                {/* Logo Section */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="w-[120px] h-[120px] mb-2 relative">
                        <Image 
                            src="/ChatGPT Image Jan 18, 2026, 10_53_24 PM.png" 
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
                    <p className="text-[#4f8596] mt-2 text-sm">Enter your email and we'll send you a link to reset your password.</p>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    <form action={handleSubmit} className="flex flex-col space-y-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-sm text-center font-medium">
                                {message}
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Email</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                <span className="material-symbols-outlined ml-4 text-[#4f8596] text-[20px]">alternate_email</span>
                                <input 
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3" 
                                    placeholder="e.g. student@campus.edu" 
                                    type="email"
                                    name="email"
                                    required
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-col space-y-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full btn-primary h-14 text-lg"
                            >
                                {loading ? 'Sending Link...' : 'Send Reset Link'}
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
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
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
