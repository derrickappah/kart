'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

function AuthCodeErrorContent() {
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const statusParam = searchParams.get('status');

    return (
        <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
            <div className="w-full max-w-[440px] flex flex-col items-stretch space-y-8 font-display">
                {/* Error Card */}
                <div className="bg-white dark:bg-[#1a2d33] rounded-3xl p-8 shadow-xl shadow-sky-950/5 border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center space-y-6">
                    {/* Icon Circle */}
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400">
                        <AlertTriangle size={32} />
                    </div>

                    {/* Typography */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                            Authentication Failed
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            We couldn&apos;t verify your login. This can happen if the authentication link has expired, has already been used, or if the login session was started on a different domain or device.
                        </p>
                    </div>

                    {/* API Error Info */}
                    {errorParam && (
                        <div className="w-full bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-950/30 rounded-2xl p-4 text-xs text-left text-red-600 dark:text-red-400">
                            <div className="font-semibold mb-1">Detailed Error Info:</div>
                            <code className="block break-all font-mono opacity-80">
                                {errorParam} {statusParam ? `(Status: ${statusParam})` : ''}
                            </code>
                        </div>
                    )}

                    {/* Suggestions */}
                    <div className="w-full text-left bg-slate-50 dark:bg-[#20363d] rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                            Troubleshooting tips:
                        </div>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Make sure you use the same browser and device that you started the login with.</li>
                            <li>Do not use the same login link multiple times.</li>
                            <li>Try logging in again to get a fresh link.</li>
                        </ul>
                    </div>

                    {/* Action Button */}
                    <Link
                        href="/login"
                        className="w-full py-4 px-6 bg-[#1daddd] hover:bg-[#1a9cc7] text-white font-medium rounded-xl transition duration-200 shadow-md shadow-sky-500/10 flex items-center justify-center space-x-2"
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Login</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function AuthCodeError() {
    return (
        <Suspense fallback={
            <main className="bg-white dark:bg-[#242428] min-h-screen flex flex-col items-center justify-center p-6 antialiased">
                <div className="animate-pulse text-[#4f8596]">Loading error details...</div>
            </main>
        }>
            <AuthCodeErrorContent />
        </Suspense>
    );
}
