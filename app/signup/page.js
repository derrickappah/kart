'use client';
import Image from 'next/image';
import Link from 'next/link';
import { signup, signInWithGoogle, signInWithGoogleToken } from '../auth/actions';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
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

    async function handleGoogleLogin() {
        setSocialLoading(true);
        setError(null);

        if (typeof window !== 'undefined') {
            const ua = navigator.userAgent || navigator.vendor || window.opera;
            const isIAB = /FBAN|FBAV|Instagram|WhatsApp|Line|Snapchat|LinkedIn|MicroMessenger|TikTok|Threads/i.test(ua);
            if (isIAB) {
                setError('Google login is blocked within this browser for your security. Please tap the menu (...) and select "Open in System Browser" or "Open in Chrome/Safari" to continue.');
                setSocialLoading(false);
                return;
            }
        }

        try {
            const { Capacitor } = await import('@capacitor/core');
            const isNative = Capacitor.isNativePlatform();

            if (isNative) {
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                // Ensure initialization if not already done
                try { await GoogleAuth.initialize(); } catch (e) {}

                const user = await GoogleAuth.signIn();
                if (user?.authentication?.idToken) {
                    const result = await signInWithGoogleToken(user.authentication.idToken);
                    if (result?.error) {
                        setError(result.error);
                        setSocialLoading(false);
                    } else if (result?.success) {
                        router.push('/profile');
                    }
                } else {
                    setError('Failed to get Google authentication token');
                    setSocialLoading(false);
                }
            } else {
                const result = await signInWithGoogle(false);
                if (result?.url) {
                    window.location.href = result.url;
                } else if (result?.error) {
                    setError(result.error);
                    setSocialLoading(false);
                }
            }
        } catch (err) {
            console.error('Google signup error:', err);
            setError('Failed to initiate Google signup');
            setSocialLoading(false);
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
                                disabled={loading || socialLoading}
                                className="w-full btn-primary h-14 text-lg"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading || socialLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/5 border border-[#d0e1e6] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10 text-[#24282D] dark:text-white font-semibold h-14 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                            >
                                {socialLoading ? (
                                    <span className="text-sm">Connecting...</span>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                                            <path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                            <path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                            <path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                            <path fill="#1565c0" d="M43.611,20.083L43.595,20L24,20v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                                        </svg>
                                        Sign Up with Google
                                    </>
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
