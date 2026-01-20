export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <main className="bg-slate-50 dark:bg-[#111d21] min-h-screen py-16 px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      <header className="max-w-4xl mx-auto text-center mb-16 px-4">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase">Privacy Policy</h1>
        <p className="text-slate-500 font-medium bg-slate-100 dark:bg-white/5 inline-block px-4 py-1 rounded-full text-sm">Last updated: {lastUpdated}</p>
      </header>

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800/40 rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 dark:border-white/5 space-y-12">
        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">1</span>
            Information We Collect
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            We collect information you provide directly to us, including your name, email address, student ID (for verification), and payment information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">2</span>
            How We Use Your Information
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            We use your information to provide, maintain, and improve our services, process transactions, send notifications, and verify seller accounts.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">3</span>
            Information Sharing
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            We do not sell your personal information. We may share information with service providers who assist us in operating our platform, subject to confidentiality agreements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">4</span>
            Data Security
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm">5</span>
            Your Rights
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            You have the right to access, update, or delete your personal information. Contact us at support@kart.com to exercise these rights.
          </p>
        </section>
      </div>
    </main>
  );
}
