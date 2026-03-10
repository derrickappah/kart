'use client';
import Image from 'next/image';
import Link from 'next/link';
import { signup } from '../auth/actions';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SignupForm() {
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(formData) {
        setLoading(true);
        setError(null);
        if (ref) {
            formData.append('referred_by', ref);
        }
        const result = await signup(formData);
        if (result?.error) {
            setError(result.error);
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
                    <h1 className="text-[#24282D] dark:text-white text-2xl font-bold leading-tight">Create Account</h1>
                    <p className="text-[#4f8596] mt-2 text-sm">Connect with fellow students and find the best deals on campus.</p>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    <form action={handleSubmit} className="flex flex-col space-y-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* Full Name Field */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Full Name</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                <span className="material-symbols-outlined ml-4 text-[#4f8596] text-[20px]">person</span>
                                <input
                                    name="full_name"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3"
                                    placeholder="Alex Johnson"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Email</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                <span className="material-symbols-outlined ml-4 text-[#4f8596] text-[20px]">alternate_email</span>
                                <input
                                    name="email"
                                    type="email"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Password</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                <span className="material-symbols-outlined ml-4 text-[#4f8596] text-[20px]">lock</span>
                                <input
                                    name="password"
                                    className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3"
                                    placeholder="••••••••"
                                    type={showPassword ? "text" : "password"}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="mr-4 text-[#4f8596] hover:text-[#1daddd] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Terms of Service */}
                        <div className="flex items-start gap-3 px-1 py-1">
                            <div className="flex items-center h-6">
                                <input
                                    className="h-5 w-5 rounded border-gray-300 dark:border-gray-700 text-[#1daddd] focus:ring-[#1daddd]"
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    required
                                />
                            </div>
                            <div className="text-sm leading-6">
                                <label className="font-normal text-[#4f8596] dark:text-gray-400" htmlFor="terms">
                                    I agree to the <Link className="text-[#1daddd] font-semibold underline underline-offset-2" href="/terms">Terms of Service</Link> and <Link className="text-[#1daddd] font-semibold underline underline-offset-2" href="/privacy">Privacy Policy</Link>.
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2 flex flex-col space-y-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary h-14 text-lg"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
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
                                <span className="material-symbols-outlined text-[20px]">login</span>
                                Log In Instead
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <footer className="pt-4">
                    <p className="text-[#4f8596] text-sm text-center px-8">
                        Already have an account?{' '}
                        <Link className="font-semibold underline ml-1" href="/login">Log In</Link>
                    </p>
                </footer>
            </div>
        </main>
    );
}

export default function Signup() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SignupForm />
        </Suspense>
    );
}
