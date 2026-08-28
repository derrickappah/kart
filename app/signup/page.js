'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';
import { signup, resendConfirmationEmail } from '../auth/actions';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, MailCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const next = searchParams.get('next');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loggingInInstead, setLoggingInInstead] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Email confirmation state
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [resendStatus, setResendStatus] = useState(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => {
            setResendCooldown(resendCooldown - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        if (ref) {
            formData.append('referred_by', ref);
        }
        if (next) {
            formData.append('next', next);
        }
        const result = await signup(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else if (result?.needsConfirmation) {
            setRegisteredEmail(result.email || formData.get('email') || '');
            setNeedsConfirmation(true);
            setLoading(false);
        }
        // If signup succeeded with an active session, redirect() was called server-side.
        setTimeout(() => setLoading(false), 5000);
    }

    async function handleResendEmail() {
        if (resendCooldown > 0 || !registeredEmail) return;
        setResendLoading(true);
        setResendStatus(null);
        const formData = new FormData();
        formData.append('email', registeredEmail);
        const result = await resendConfirmationEmail(formData);
        setResendLoading(false);
        if (result?.error) {
            setResendStatus({ type: 'error', message: result.error });
        } else {
            setResendStatus({ type: 'success', message: 'A new confirmation email has been sent! Please check your inbox and spam folder.' });
            setResendCooldown(60);
        }
    }

    if (needsConfirmation) {
        return (
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
                <div className="w-full max-w-[420px] flex flex-col items-stretch space-y-8 font-display animate-in fade-in zoom-in-95 duration-300">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center space-y-2">
                        <div className="w-[100px] h-[100px] mb-2 relative">
                            <Image
                                src="/logo.png"
                                alt="KART Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Confirmation Card */}
                    <div className="bg-slate-50 dark:bg-white/5 border border-[#d0e1e6] dark:border-gray-700 rounded-3xl p-8 text-center flex flex-col items-center space-y-6 shadow-sm">
                        <div className="size-16 bg-sky-50 dark:bg-sky-950/40 text-[#1daddd] rounded-2xl flex items-center justify-center">
                            <MailCheck size={36} />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-[#24282D] dark:text-white">Verify Your Email</h1>
                            <p className="text-[#4f8596] dark:text-gray-300 text-sm leading-relaxed">
                                We sent a confirmation link to:
                            </p>
                            <p className="font-semibold text-base text-[#1daddd] break-all px-2 py-1 bg-[#1daddd]/10 rounded-lg">
                                {registeredEmail}
                            </p>
                            <p className="text-xs text-[#4f8596] dark:text-gray-400 mt-2">
                                Please click the link in the email to activate your campus account and start buying/selling.
                            </p>
                        </div>

                        {resendStatus && (
                            <div className={`w-full p-3 rounded-xl text-xs font-medium ${resendStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'}`}>
                                {resendStatus.message}
                            </div>
                        )}

                        <div className="w-full flex flex-col space-y-3 pt-2">
                            <button
                                onClick={handleResendEmail}
                                disabled={resendLoading || resendCooldown > 0}
                                className="w-full py-3.5 px-4 bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 hover:border-[#1daddd] text-[#24282D] dark:text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {resendLoading ? (
                                    <>
                                        <Loader2 className="animate-spin size-4" />
                                        Sending...
                                    </>
                                ) : resendCooldown > 0 ? (
                                    `Resend Email in ${resendCooldown}s`
                                ) : (
                                    "Didn't receive the email? Resend"
                                )}
                            </button>

                            <Link
                                href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                                className="w-full btn-primary py-4 text-base font-bold flex items-center justify-center gap-2"
                            >
                                Proceed to Log In
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
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
                    <h1 className="text-[#24282D] dark:text-white text-2xl font-bold leading-tight">Create Account</h1>
                    <p className="text-[#4f8596] mt-2 text-sm">Connect with fellow students and find the best deals on campus.</p>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* Full Name Field */}
                        <div className="flex flex-col space-y-2">
                            <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Full Name</label>
                            <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                <DynamicLucideIcon name="person" className="ml-4 text-[#4f8596] text-[20px]" />
                                <input
                                    name="full_name"
                                    autoComplete="name"
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
                                <DynamicLucideIcon name="alternate_email" className="ml-4 text-[#4f8596] text-[20px]" />
                                <input
                                    name="email"
                                    type="email"
                                    autoComplete="email"
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
                                <DynamicLucideIcon name="lock" className="ml-4 text-[#4f8596] text-[20px]" />
                                <input
                                    name="password"
                                    autoComplete="new-password"
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
                                    <DynamicLucideIcon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
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
                                disabled={loading || loggingInInstead}
                                className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin h-5 w-5" />
                                        Creating Account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </button>

                            <Link
                                href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                                onClick={() => setLoggingInInstead(true)}
                                className={`bg-[#24282D] dark:bg-white/10 hover:bg-[#24282D]/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2 ${loading || loggingInInstead ? 'pointer-events-none opacity-50' : ''}`}
                            >
                                {loggingInInstead ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    <DynamicLucideIcon name="login" className="text-[20px]" />
                                )}
                                Log In Instead
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <footer className="pt-4">
                    <p className="text-[#4f8596] text-sm text-center px-8">
                        Already have an account?{' '}
                        <Link 
                            className={`font-semibold underline ml-1 ${loading || loggingInInstead ? 'pointer-events-none opacity-50' : ''}`} 
                            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                            onClick={() => setLoggingInInstead(true)}
                        >
                            {loggingInInstead ? 'Loading...' : 'Log In'}
                        </Link>
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

