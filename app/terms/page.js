export default function TermsPage() {
  const lastUpdated = new Date().toLocaleDateString();

  return (
    <main className="bg-slate-50 dark:bg-[#111d21] min-h-screen py-16 px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      <header className="max-w-4xl mx-auto text-center mb-16 px-4">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase">Terms & Conditions</h1>
        <p className="text-slate-500 font-medium bg-slate-100 dark:bg-white/5 inline-block px-4 py-1 rounded-full text-sm">Last updated: {lastUpdated}</p>
      </header>

      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800/40 rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 dark:border-white/5 space-y-12">
        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">1</span>
            Acceptance of Terms
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            By accessing and using KART, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">2</span>
            User Accounts
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">3</span>
            Seller Subscriptions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            Sellers must maintain an active subscription to list products. Subscriptions auto-renew unless cancelled. Refunds are not available for partial subscription periods.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">4</span>
            Prohibited Items
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            You may not list illegal items, stolen goods, or items that violate campus policies. KART reserves the right to remove any listing at any time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">5</span>
            Transactions
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            KART facilitates transactions but is not a party to the sale. All transactions are between buyers and sellers. We are not responsible for the quality, safety, or legality of items listed.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm">6</span>
            Limitation of Liability
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium pl-11">
            KART shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
          </p>
        </section>
      </div>
    </main>
  );
}
