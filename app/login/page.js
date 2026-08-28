'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import Link from 'next/link';
import { login, sendMagicLink, resendConfirmationEmail } from '../auth/actions';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Mail, CheckCircle2, Sparkles, KeyRound } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next');

    // Auth mode: 'password' | 'magic-link'
    const [authMode, setAuthMode] = useState('password');

    // Password login state
    const [error, setError] = useState(null);
    const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
    const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
    const [resendStatus, setResendStatus] = useState(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Magic link state
    const [magicEmail, setMagicEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [magicCooldown, setMagicCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => {
            setResendCooldown(resendCooldown - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    useEffect(() => {
        if (magicCooldown <= 0) return;
        const timer = setTimeout(() => {
            setMagicCooldown(magicCooldown - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [magicCooldown]);

    async function handlePasswordSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setEmailNotConfirmed(false);
        setResendStatus(null);
        const formData = new FormData(e.currentTarget);
        if (next) {
            formData.append('next', next);
        }
        const result = await login(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
            if (result?.emailNotConfirmed) {
                setEmailNotConfirmed(true);
                setUnconfirmedEmail(result.email || formData.get('email') || '');
            }
        }
        // If login succeeded, redirect() was called server-side.
        setTimeout(() => setLoading(false), 5000);
    }

    async function handleMagicLinkSubmit(e) {
        e.preventDefault();
        if (magicCooldown > 0) return;
        setLoading(true);
        setError(null);
        const formData = new FormData(e.currentTarget);
        const email = String(formData.get('email') || '').trim();
        setMagicEmail(email);
        if (next) {
            formData.append('next', next);
        }
        const result = await sendMagicLink(formData);
        setLoading(false);
        if (result?.error) {
            setError(result.error);
        } else if (result?.success) {
            setMagicLinkSent(true);
            setMagicCooldown(60);
        }
    }

    async function handleResendMagicLink() {
        if (magicCooldown > 0 || !magicEmail) return;
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('email', magicEmail);
        if (next) {
            formData.append('next', next);
        }
        const result = await sendMagicLink(formData);
        setLoading(false);
        if (result?.error) {
            setError(result.error);
        } else {
            setMagicCooldown(60);
        }
    }

    async function handleResendConfirmation() {
        if (resendCooldown > 0 || !unconfirmedEmail) return;
        setResendLoading(true);
        setResendStatus(null);
        const formData = new FormData();
        formData.append('email', unconfirmedEmail);
        const result = await resendConfirmationEmail(formData);
        setResendLoading(false);
        if (result?.error) {
            setResendStatus({ type: 'error', message: result.error });
        } else {
            setResendStatus({ type: 'success', message: 'A new confirmation email has been sent! Please check your inbox and spam folder.' });
            setResendCooldown(60);
        }
    }

    return (
        <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
            {/* Container for iPhone factor */}
            <div className="w-full max-w-[400px] flex flex-col items-stretch space-y-7 font-display">
                {/* TopAppBar / Logo Section */}
                <div className="flex flex-col items-center space-y-2">
                    <div className="w-[110px] h-[110px] mb-1 relative">
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
                    <h1 className="text-[#24282D] dark:text-white text-2xl font-bold leading-tight">Welcome back, Student</h1>
                    <p className="text-[#4f8596] mt-1.5 text-sm">
                        {authMode === 'magic-link' ? 'Sign in password-free with a single click' : 'Log in to browse the campus marketplace'}
                    </p>
                </div>

                {/* Auth Mode Tabs */}
                <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-[#111d21] rounded-2xl border border-gray-200/80 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={() => { setAuthMode('password'); setError(null); }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            authMode === 'password'
                                ? 'bg-white dark:bg-[#1f333a] text-[#24282D] dark:text-white shadow-sm'
                                : 'text-[#4f8596] hover:text-[#24282D] dark:hover:text-white'
                        }`}
                    >
                        <KeyRound size={16} />
                        Password
                    </button>
                    <button
                        type="button"
                        onClick={() => { setAuthMode('magic-link'); setError(null); }}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            authMode === 'magic-link'
                                ? 'bg-white dark:bg-[#1f333a] text-[#1daddd] shadow-sm'
                                : 'text-[#4f8596] hover:text-[#1daddd]'
                        }`}
                    >
                        <Sparkles size={16} />
                        Magic Link
                    </button>
                </div>

                {/* Form Section */}
                <div className="flex flex-col space-y-5">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm text-center font-medium flex flex-col space-y-2">
                            <span>{error}</span>
                            {emailNotConfirmed && (
                                <div className="pt-1">
                                    <button
                                        type="button"
                                        onClick={handleResendConfirmation}
                                        disabled={resendLoading || resendCooldown > 0}
                                        className="text-xs text-[#1daddd] underline font-semibold hover:text-[#1a9cc7] transition-colors disabled:opacity-50"
                                    >
                                        {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Resend link in ${resendCooldown}s` : 'Resend confirmation link'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {resendStatus && (
                        <div className={`p-3 rounded-xl text-xs text-center font-medium ${resendStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'}`}>
                            {resendStatus.message}
                        </div>
                    )}

                    {/* MAGIC LINK MODE */}
                    {authMode === 'magic-link' ? (
                        magicLinkSent ? (
                            <div className="bg-slate-50 dark:bg-white/5 border border-[#d0e1e6] dark:border-gray-700 rounded-2xl p-6 text-center flex flex-col items-center space-y-4 animate-in fade-in duration-300">
                                <div className="size-14 bg-sky-50 dark:bg-sky-950/40 text-[#1daddd] rounded-2xl flex items-center justify-center">
                                    <Mail size={28} />
                                </div>
                                <div className="space-y-1.5">
                                    <h2 className="text-lg font-bold text-[#24282D] dark:text-white">Check Your Inbox</h2>
                                    <p className="text-xs text-[#4f8596] dark:text-gray-300">We sent an instant login link to:</p>
                                    <p className="font-semibold text-sm text-[#1daddd] break-all px-2 py-1 bg-[#1daddd]/10 rounded-lg">
                                        {magicEmail}
                                    </p>
                                    <p className="text-xs text-[#4f8596] dark:text-gray-400 pt-1">
                                        Click the link in your email to sign in immediately without a password.
                                    </p>
                                </div>

                                <div className="w-full flex flex-col space-y-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleResendMagicLink}
                                        disabled={loading || magicCooldown > 0}
                                        className="w-full py-3 px-4 bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 hover:border-[#1daddd] text-[#24282D] dark:text-white font-semibold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin size-3.5" /> : null}
                                        {magicCooldown > 0 ? `Resend Link in ${magicCooldown}s` : 'Resend Magic Link'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setMagicLinkSent(false); }}
                                        className="text-xs text-[#4f8596] hover:text-[#1daddd] font-semibold py-1.5"
                                    >
                                        Use a different email address
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleMagicLinkSubmit} className="flex flex-col space-y-5">
                                {/* Email Field */}
                                <div className="flex flex-col space-y-2">
                                    <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Email Address</label>
                                    <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                        <DynamicLucideIcon name="alternate_email" className="ml-4 text-[#4f8596] text-[20px]" />
                                        <input 
                                            className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3" 
                                            placeholder="e.g. student@campus.edu" 
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            required
                                            defaultValue={magicEmail}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex flex-col space-y-4">
                                    <button 
                                        type="submit" 
                                        disabled={loading || magicCooldown > 0}
                                        className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin h-5 w-5" />
                                                Sending link...
                                            </>
                                        ) : magicCooldown > 0 ? (
                                            `Resend in ${magicCooldown}s`
                                        ) : (
                                            <>
                                                <Sparkles size={18} />
                                                Send Magic Link
                                            </>
                                        )}
                                    </button>

                                    <Link 
                                        href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
                                        onClick={() => setCreatingAccount(true)}
                                        className={`bg-[#24282D] dark:bg-white/10 hover:bg-[#24282D]/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2 ${creatingAccount || loading ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        {creatingAccount ? (
                                            <Loader2 className="animate-spin h-5 w-5" />
                                        ) : (
                                            <DynamicLucideIcon name="person_add" className="text-[20px]" />
                                        )}
                                        Create an Account
                                    </Link>
                                </div>
                            </form>
                        )
                    ) : (
                        /* PASSWORD MODE */
                        <form onSubmit={handlePasswordSubmit} className="flex flex-col space-y-5">
                            {/* Email Field */}
                            <div className="flex flex-col space-y-2">
                                <label className="text-[#24282D] dark:text-gray-300 text-sm font-semibold px-1">Email Address</label>
                                <div className="relative flex items-center bg-white dark:bg-[#111d21] border border-[#d0e1e6] dark:border-gray-700 rounded-xl transition-all duration-200 shadow-sm focus-within:border-[#1daddd] focus-within:ring-4 focus-within:ring-[#1daddd]/10">
                                    <DynamicLucideIcon name="alternate_email" className="ml-4 text-[#4f8596] text-[20px]" />
                                    <input 
                                        className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3" 
                                        placeholder="e.g. student@campus.edu" 
                                        type="email"
                                        name="email"
                                        autoComplete="email"
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
                                        className="w-full bg-transparent border-none focus:ring-0 h-14 text-[#24282D] dark:text-white placeholder:text-[#4f8596]/60 text-base px-3" 
                                        placeholder="••••••••" 
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        autoComplete="current-password"
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
                                <div className="flex justify-end">
                                    <Link className="text-[#1daddd] text-sm font-medium hover:underline pt-1" href="/forgot-password">Forgot Password?</Link>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 flex flex-col space-y-4">
                                <button 
                                    type="submit" 
                                    disabled={loading || creatingAccount}
                                    className="w-full btn-primary h-14 text-lg flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin h-5 w-5" />
                                            Logging in...
                                        </>
                                    ) : (
                                        'Log In'
                                    )}
                                </button>

                                <Link 
                                    href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
                                    onClick={() => setCreatingAccount(true)}
                                    className={`bg-[#24282D] dark:bg-white/10 hover:bg-[#24282D]/90 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] text-base flex items-center justify-center gap-2 ${creatingAccount || loading ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    {creatingAccount ? (
                                        <Loader2 className="animate-spin h-5 w-5" />
                                    ) : (
                                        <DynamicLucideIcon name="person_add" className="text-[20px]" />
                                    )}
                                    Create an Account
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                {/* Secondary Meta Text / Footer */}
                <footer className="pt-2">
                    <p className="text-[#4f8596] text-sm text-center px-8">
                        By logging in, you agree to our 
                        <Link className="font-semibold underline ml-1" href="/terms">Terms of Service</Link> and 
                        <Link className="font-semibold underline ml-1" href="/privacy">Privacy Policy</Link>.
                    </p>
                </footer>
            </div>
        </main>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}


