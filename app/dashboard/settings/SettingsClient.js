'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signout } from '../../auth/actions';

export default function SettingsClient({ initialProfile, initialUser }) {
  const router = useRouter();
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    display_name: initialProfile?.display_name || initialUser?.user_metadata?.full_name || '',
    email: initialProfile?.email || initialUser?.email || '',
    campus: initialProfile?.campus || '',
  });

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display text-slate-900 dark:text-white min-h-screen flex flex-col antialiased transition-colors duration-200">


      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-4 space-y-8 no-scrollbar">
        {/* Personal Info Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 ml-2">Personal Info</h3>
          <div className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Email Item */}
            <Link href="/dashboard/settings/account/email" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="flex items-center justify-center size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-base font-semibold text-slate-900 dark:text-white">Email</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{profileData.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-4 shrink-0">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
              </div>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            {/* Phone Item */}
            <Link href="/dashboard/settings/account/phone" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Phone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 dark:text-slate-500 hidden sm:block">Update Phone</span>
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
              </div>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            {/* Seller Verification */}
            <Link href="/dashboard/settings/verify" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-[#247d8f]/10 text-[#247d8f] shrink-0">
                  <span className="material-symbols-outlined">verified_user</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Seller Verification</span>
              </div>
              <div className="flex items-center gap-2">
                {(initialProfile?.is_verified || initialProfile?.verification_status === 'Approved') ? (
                  <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-200 dark:border-green-900/50">
                    <span className="material-symbols-outlined text-[14px] text-green-700 dark:text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span className="text-xs font-bold text-green-700 dark:text-green-400">Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-[14px] text-slate-500 dark:text-slate-400">pending</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Not Verified</span>
                  </div>
                )}
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Security Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 ml-2">Security</h3>
          <div className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
            <Link href="/dashboard/settings/security/password" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 shrink-0">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Change Password</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            <Link href="/dashboard/settings/security/2fa" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 shrink-0">
                  <span className="material-symbols-outlined">shield</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">Off</span>
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
              </div>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            <Link href="/dashboard/settings/security/activity" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 shrink-0">
                  <span className="material-symbols-outlined">history</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Login Activity</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </Link>
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 ml-2">Preferences</h3>
          <div className="bg-white dark:bg-[#1E292B] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
            <Link href="/dashboard/settings/payout" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Payout Details</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            <Link href="/dashboard/settings/preferences/notifications" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shrink-0">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Notifications</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
            </Link>
            <div className="h-px w-full bg-slate-100 dark:bg-slate-700/50 ml-16"></div>

            <Link href="/dashboard/settings/preferences/language" className="group relative flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-inherit no-underline">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-10 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 shrink-0">
                  <span className="material-symbols-outlined">language</span>
                </div>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Language</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">English</span>
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">chevron_right</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="pt-4 pb-12 flex flex-col items-center gap-4">
          <button
            onClick={() => signout()}
            className="w-full bg-white dark:bg-[#1E292B] border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold py-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Log Out
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">Version 2.4.0 (Build 302)</p>
        </div>
      </main>
    </div>
  );
}
