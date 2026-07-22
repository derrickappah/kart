import { createClient } from '@/utils/supabase/server';

export const metadata = {
  title: "Under Maintenance | KART",
  description: "KART is temporarily offline for scheduled maintenance.",
};

export default async function MaintenancePage() {
  const supabase = await createClient();
  let supportEmail = 'support@kart.cx';

  try {
    const { data: setting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_support_email')
      .single();

    if (setting?.value) {
      // support_email might be stored as a JSON string like '"support@kart.cx"'
      const val = setting.value;
      supportEmail = typeof val === 'string' ? val.replace(/^"|"$/g, '') : val;
    }
  } catch (e) {
    // Fallback to default
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-white relative overflow-hidden font-sans">
      {/* Decorative Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/25 to-purple-500/0 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-cyan-500/20 to-blue-500/0 blur-[120px] pointer-events-none" />
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* Main Card */}
      <div className="relative z-10 max-w-xl mx-auto px-6 text-center">
        {/* Animated Icon Container */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-xl animate-pulse" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl">
            <svg 
              className="w-16 h-16 text-indigo-400 animate-[spin_8s_linear_infinite]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Brand */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          KART Platform
        </div>

        {/* Headings */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
          Under Maintenance
        </h1>
        
        <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
          We are currently optimizing and upgrading KART to bring you a faster, more premium student marketplace experience. We'll be back online shortly!
        </p>

        {/* Status Box */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 mt-0.5">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-200 text-sm sm:text-base">Your Data is Safe</h4>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                All your listings, active chats, orders, and wallet funds are fully preserved. If you have any urgent queries, contact support.
              </p>
            </div>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-sm text-zinc-500">
          Need immediate assistance? Email us at{' '}
          <a 
            href={`mailto:${supportEmail}`} 
            className="text-indigo-400 hover:text-indigo-300 underline font-medium transition-colors"
          >
            {supportEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
