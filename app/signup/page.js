'use client';
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
        <main className="bg-[#fafafa] dark:bg-[#21242c] antialiased">
            <div className="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto overflow-x-hidden font-display">
                {/* TopAppBar */}
                <header className="flex items-center bg-[#fafafa] dark:bg-[#21242c] p-4 pb-2 justify-between sticky top-0 z-10">
                    <Link href="/login" className="text-[#0e181b] dark:text-white flex size-12 shrink-0 items-center justify-center cursor-pointer">
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </Link>
                    <h2 className="text-[#0e181b] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">Create Account</h2>
                </header>

                <div className="flex-1 flex flex-col px-6 pt-4 pb-12">
                    {/* HeadlineText */}
                    <div className="mb-2">
                        <h1 className="text-[#0e181b] dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center pb-2">Join the Campus Market</h1>
                    </div>
                    {/* BodyText */}
                    <div className="mb-8">
                        <p className="text-[#4f8596] dark:text-gray-400 text-base font-normal leading-normal text-center">Connect with fellow students and find the best deals on campus.</p>
                    </div>

                    {/* Form Container */}
                    <form action={handleSubmit} className="flex flex-col gap-5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        {/* TextField: Full Name */}
                        <div className="flex flex-col">
                            <label className="flex flex-col w-full">
                                <p className="text-[#0e181b] dark:text-gray-200 text-base font-medium leading-normal pb-2 ml-1">Full Name</p>
                                <div className="flex w-full items-stretch rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-[#1daddd]">
                                    <input
                                        name="full_name"
                                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#0e181b] dark:text-white focus:outline-0 focus:ring-0 border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] h-14 placeholder:text-[#4f8596] p-[15px] rounded-r-none border-r-0 pr-2 text-base font-normal"
                                        placeholder="Alex Johnson"
                                        required
                                    />
                                    <div className="text-[#4f8596] flex border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] items-center justify-center pr-[15px] rounded-r-xl border-l-0">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* TextField: Email */}
                        <div className="flex flex-col">
                            <label className="flex flex-col w-full">
                                <p className="text-[#0e181b] dark:text-gray-200 text-base font-medium leading-normal pb-2 ml-1">Email</p>
                                <div className="flex w-full items-stretch rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-[#1daddd]">
                                    <input
                                        name="email"
                                        type="email"
                                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#0e181b] dark:text-white focus:outline-0 focus:ring-0 border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] h-14 placeholder:text-[#4f8596] p-[15px] rounded-r-none border-r-0 pr-2 text-base font-normal"
                                        placeholder="your@email.com"
                                        required
                                    />
                                    <div className="text-[#4f8596] flex border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] items-center justify-center pr-[15px] rounded-r-xl border-l-0">
                                        <span className="material-symbols-outlined">mail</span>
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* TextField: Password */}
                        <div className="flex flex-col">
                            <label className="flex flex-col w-full">
                                <p className="text-[#0e181b] dark:text-gray-200 text-base font-medium leading-normal pb-2 ml-1">Password</p>
                                <div className="flex w-full items-stretch rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] focus-within:ring-2 focus-within:ring-[#1daddd]">
                                    <input
                                        name="password"
                                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#0e181b] dark:text-white focus:outline-0 focus:ring-0 border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] h-14 placeholder:text-[#4f8596] p-[15px] rounded-r-none border-r-0 pr-2 text-base font-normal"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-[#4f8596] flex border border-[#d0e1e6] dark:border-gray-700 bg-white dark:bg-[#21242c] items-center justify-center pr-[15px] rounded-r-xl border-l-0"
                                    >
                                        <span className="material-symbols-outlined">
                                            {showPassword ? 'visibility_off' : 'lock'}
                                        </span>
                                    </button>
                                </div>
                            </label>
                        </div>

                        {/* Terms of Service */}
                        <div className="flex items-start gap-3 px-1 py-2">
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

                        {/* Primary Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary h-14 text-lg"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    {/* Secondary Navigation */}
                    <div className="mt-auto pt-10 text-center">
                        <p className="text-[#4f8596] dark:text-gray-400">
                            Already have an account?
                            <Link className="text-[#1daddd] font-bold ml-1 hover:underline" href="/login">Log In</Link>
                        </p>
                    </div>
                </div>
                {/* Bottom Indicator (iOS style) */}
                <div className="h-2 w-32 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-2 opacity-50"></div>
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
