'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailto = `mailto:kartzendo@gmail.com?subject=${encodeURIComponent(
      'KART Account Deletion Request - ' + email
    )}&body=${encodeURIComponent(
      `Hello KART Support Team,\n\nI would like to request the permanent deletion of my KART account and all associated personal data.\n\nAccount Details:\n- Registered Email: ${email}\n- Phone Number: ${phone}\n- Reason (Optional): ${reason}\n\nI understand that this action is irreversible.\n\nThank you.`
    )}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <main className="bg-white dark:bg-[#242428] min-h-screen py-8 px-4 md:px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="max-w-3xl mx-auto flex items-center gap-4 mb-8 px-2">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 active:scale-95 transition-transform text-[#1daddd]"
          aria-label="Go back"
        >
          <DynamicLucideIcon name="arrow-left" className="size-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Request Account & Data Deletion
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            KART User Data & Privacy Policy
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-[#1E292B] rounded-3xl p-6 md:p-10 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-white/5 space-y-8">
        
        {/* Option 1: In-App Deletion */}
        <section className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3 mb-2">
            <span className="size-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-[#1daddd] flex items-center justify-center font-bold text-sm">
              1
            </span>
            <h2 className="text-base md:text-lg font-bold">Fastest: Delete directly in the App</h2>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 ml-11 mb-3">
            If you still have the KART app or website access, you can delete your account instantly:
          </p>
          <ol className="text-xs md:text-sm text-slate-600 dark:text-slate-300 ml-16 list-decimal space-y-1 mb-4">
            <li>Log into your account.</li>
            <li>Go to <strong>Settings</strong> from your Dashboard.</li>
            <li>Scroll down to the <strong>Danger Zone</strong>.</li>
            <li>Click <strong>Request Account Deletion</strong> and confirm.</li>
          </ol>
          <div className="ml-11">
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold text-white bg-[#1daddd] hover:bg-[#1796c0] rounded-xl transition-colors shadow-sm"
            >
              Open Account Settings
              <DynamicLucideIcon name="external-link" className="size-3.5" />
            </Link>
          </div>
        </section>

        {/* Option 2: Web Deletion Request Form */}
        <section className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3 mb-2">
            <span className="size-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-[#1daddd] flex items-center justify-center font-bold text-sm">
              2
            </span>
            <h2 className="text-base md:text-lg font-bold">Web Request (App uninstalled / No login)</h2>
          </div>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 ml-11 mb-4">
            If you have uninstalled the app or cannot log in, submit the form below. Our support team will process your deletion request within 7 business days.
          </p>

          {submitted ? (
            <div className="ml-11 p-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs md:text-sm border border-emerald-500/20">
              ✓ Deletion email request initiated! If your email client didn't open automatically, please send your email directly to{' '}
              <a href="mailto:kartzendo@gmail.com" className="font-bold underline">kartzendo@gmail.com</a>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="ml-11 space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#1daddd]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Phone Number (Used on KART)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#1daddd]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Reason for Deletion (Optional)
                </label>
                <textarea
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us why you are leaving..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-[#1daddd]"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
              >
                Submit Account Deletion Request
              </button>
            </form>
          )}
        </section>

        {/* Data Retention & Deletion Disclosure */}
        <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs md:text-sm text-slate-500 dark:text-slate-400">
          <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
            What data is deleted and what is retained?
          </h3>
          <ul className="list-disc ml-5 space-y-1">
            <li>
              <strong>Immediately deleted:</strong> Your profile data (name, avatar, campus), active product listings, messaging history, and authentication sessions.
            </li>
            <li>
              <strong>Verification data:</strong> Uploaded student IDs used for seller verification are purged upon deletion verification.
            </li>
            <li>
              <strong>Retained data:</strong> Completed order transaction receipts and financial ledger records are retained for statutory accounting and fraud prevention periods as required by law.
            </li>
          </ul>
          <p className="pt-2">
            For further information, please read our{' '}
            <Link href="/privacy" className="text-[#1daddd] font-semibold hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </section>

      </div>
    </main>
  );
}
