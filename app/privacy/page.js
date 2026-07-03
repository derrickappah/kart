'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
  const router = useRouter();

  const sections = [
    {
      id: 1,
      title: 'Information We Collect',
      icon: 'person_add',
      content: 'We collect information that you directly provide to us when creating an account, editing your profile, or listing products. This includes your full name, email address, phone number, university affiliation, student ID (uploaded solely for seller verification), listing images and descriptions, and chat messages sent through our in-app messaging system.'
    },
    {
      id: 2,
      title: 'How We Use Your Information',
      icon: 'settings_suggest',
      content: 'We use the collected information to: (i) operate, maintain, and improve the KART marketplace; (ii) verify your student status to ensure campus safety; (iii) process listings and facilitate chat communication between buyers and sellers; (iv) send you notifications, transaction updates, and support messages; and (v) detect and prevent fraud or violations of our campus policies.'
    },
    {
      id: 3,
      title: 'Information Sharing & Disclosure',
      icon: 'groups',
      content: 'KART does not sell or rent your personal information to third parties. We share your information only in the following ways: (i) with other KART users when you send messages or agree to buy/sell items; (ii) with trusted service providers who assist us in operating our platform (e.g., Supabase database hosting, Paystack payment processing); and (iii) when required by law or to protect the safety of the campus community.'
    },
    {
      id: 4,
      title: 'Data Security & Storage',
      icon: 'security',
      content: 'We prioritize your data security. All sensitive information (including passwords, tokens, and verification status) is encrypted and securely stored. We implement industry-standard safeguards to prevent unauthorized access or disclosure. However, please remember that no method of transmission over the internet or electronic storage is 100% secure.'
    },
    {
      id: 5,
      title: 'Your Rights & Choices',
      icon: 'rule',
      content: 'You have full control over your personal data. You can access, edit, or update your profile details and notification preferences directly from the Account Settings panel. You also have the right to request the permanent deletion of your account and all associated data, which can be initiated from the Danger Zone within your settings page.'
    },
    {
      id: 6,
      title: 'Cookies & Tracking',
      icon: 'language',
      content: 'We use cookies and similar browser storage technologies to keep you logged in, remember your preferences (such as dark mode settings), and analyze platform traffic. You can configure your browser to reject cookies, but doing so may limit your ability to use certain features of the KART marketplace.'
    },
    {
      id: 7,
      title: 'Changes to This Policy',
      icon: 'history',
      content: 'We may update our Privacy Policy from time to time to reflect changes in our practices or campus regulations. We will notify you of any changes by updating the "Last updated" date at the top of this page. We encourage you to review this policy periodically to stay informed about how we protect your information.'
    }
  ];

  return (
    <main className="bg-white dark:bg-[#242428] min-h-screen py-8 px-4 md:px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="max-w-4xl mx-auto flex items-center gap-4 mb-10 px-2">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-white/5 active:scale-95 transition-transform text-[#1daddd] dark:text-[#1daddd]"
        >
          <DynamicLucideIcon name="arrow_back" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last updated: July 2026</p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1E292B] rounded-3xl p-6 md:p-10 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-white/5 space-y-8 md:space-y-10">
        <div className="text-center max-w-2xl mx-auto pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Your privacy is extremely important to us. This Privacy Policy describes how we collect, use, and protect your personal information at KART.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              className="flex gap-4 md:gap-6 items-start group"
            >
              <div className="flex items-center justify-center size-10 md:size-12 rounded-2xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400 shrink-0 transition-transform group-hover:scale-105 duration-300">
                <DynamicLucideIcon name={section.icon} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-xs font-black text-blue-500/60 tracking-wider">0{section.id}.</span>
                  {section.title}
                </h2>
                <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {section.content}
                </p>
              </div>
            </section>
          ))}
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
          <p>Have questions or concerns about your data and privacy?</p>
          <p className="mt-1">
            Email us at{' '}
            <a href="mailto:kartzendo@gmail.com" className="text-blue-500 font-bold hover:underline">
              kartzendo@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
