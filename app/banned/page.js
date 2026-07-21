'use client';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { AlertOctagon, LogOut, Mail } from 'lucide-react';

export default function BannedPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0d1317] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#182125]/80 border border-red-500/30 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="size-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto">
          <AlertOctagon className="size-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">Account Suspended</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your account has been suspended by an administrator for violating platform policies and terms of service.
          </p>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-left text-xs text-red-400/90 space-y-1">
          <p className="font-bold">What this means:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>Access to app features and listings is disabled.</li>
            <li>Active sessions have been terminated.</li>
          </ul>
        </div>

        <div className="pt-2 space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>

          <a
            href="mailto:support@kart.cx"
            className="w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="size-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
