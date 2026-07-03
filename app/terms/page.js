'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();

  const sections = [
    {
      id: 1,
      title: 'Acceptance of Terms',
      icon: 'verified_user',
      content: 'By registering, accessing, or using the KART campus marketplace platform, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to all of these terms, you must not access or use our services. These terms apply to all buyers, sellers, visitors, and others who access or use the platform.'
    },
    {
      id: 2,
      title: 'Eligibility & User Accounts',
      icon: 'groups',
      content: 'To use KART, you must be an active student, faculty member, or staff member of an authorized university. You are responsible for safeguarding your account details and password. Any actions taken under your account are your sole responsibility. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.'
    },
    {
      id: 3,
      title: 'Seller Rules & Subscriptions',
      icon: 'store',
      content: 'Sellers must maintain an active subscription to list items for sale on KART. All listings must be accurate, complete, and honest. Subscriptions auto-renew unless cancelled. Refunds are not available for partial billing cycles. KART reserves the right to suspend or terminate seller accounts that list false information, spam, or engage in fraudulent activities.'
    },
    {
      id: 4,
      title: 'Prohibited Items & Activities',
      icon: 'block',
      content: 'You may not sell, purchase, or advertise any of the following items on KART: illegal drugs, alcohol, tobacco, e-cigarettes, weapons of any kind, stolen property, counterfeit goods, hazardous materials, academic dishonesty materials (e.g., test banks, graded assignments), or items that violate university code of conduct policies. KART reserves the right to remove any listing immediately without prior notice.'
    },
    {
      id: 5,
      title: 'Transactions & Meetup Safety',
      icon: 'payments',
      content: 'KART acts solely as a venue to connect student buyers and sellers. All transactions, exchanges, and payments are negotiated and conducted directly between the buyer and the seller. We do not handle physical item exchanges or guarantee item quality. We strongly encourage all users to meet in well-lit, public, on-campus locations (e.g., campus libraries, union buildings, security zones) to complete transactions safely.'
    },
    {
      id: 6,
      title: 'Intellectual Property Rights',
      icon: 'policy',
      content: 'All content, branding, design, logos, and software on KART are the exclusive property of KART and its licensors. When you post listings, images, or text, you grant KART a non-exclusive, worldwide, royalty-free license to use, display, modify, and distribute your content solely for the purpose of operating and promoting the platform.'
    },
    {
      id: 7,
      title: 'Limitation of Liability',
      icon: 'warning',
      content: 'To the maximum extent permitted by law, KART, its creators, and affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or other intangible losses resulting from: (i) your access to or use of the service; (ii) any conduct or content of third parties on the service; or (iii) any items purchased or transactions completed via the platform.'
    },
    {
      id: 8,
      title: 'Termination',
      icon: 'logout',
      content: 'We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms. If you wish to terminate your account, you can request account deletion through the settings panel.'
    },
    {
      id: 9,
      title: 'Changes to Terms',
      icon: 'history',
      content: 'We reserve the right, at our sole discretion, to modify or replace these Terms at any time. When we update the terms, we will revise the "Last updated" date at the top of the page. Your continued use of the platform after any changes constitutes acceptance of the new terms.'
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
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Terms & Conditions</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Last updated: July 2026</p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-[#1E292B] rounded-3xl p-6 md:p-10 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-white/5 space-y-8 md:space-y-10">
        <div className="text-center max-w-2xl mx-auto pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Please read these Terms & Conditions carefully before using the KART marketplace. By using our services, you agree to these rules.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              className="flex gap-4 md:gap-6 items-start group"
            >
              <div className="flex items-center justify-center size-10 md:size-12 rounded-2xl bg-[#1daddd]/10 text-[#1daddd] dark:bg-[#1daddd]/20 dark:text-[#1daddd] shrink-0 transition-transform group-hover:scale-105 duration-300">
                <DynamicLucideIcon name={section.icon} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-xs font-black text-[#1daddd]/60 tracking-wider">0{section.id}.</span>
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
          <p>Have questions about our Terms and Conditions?</p>
          <p className="mt-1">
            Contact us at{' '}
            <a href="mailto:kartzendo@gmail.com" className="text-[#1daddd] font-bold hover:underline">
              kartzendo@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
