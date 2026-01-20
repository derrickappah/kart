const safetyTips = [
  {
    title: 'Meet in Public Places',
    description: 'Always meet in well-lit, public areas on campus. Avoid meeting in isolated locations.',
  },
  {
    title: 'Bring a Friend',
    description: 'Consider bringing a friend when meeting for high-value transactions. There\'s safety in numbers.',
  },
  {
    title: 'Verify Before Meeting',
    description: 'Check the seller\'s verification status and reviews before arranging a meeting.',
  },
  {
    title: 'Inspect Items Thoroughly',
    description: 'Examine items carefully before completing the transaction. Test electronics if possible.',
  },
  {
    title: 'Use Secure Payment',
    description: 'Use KART\'s wallet system or meet in person with cash. Avoid wire transfers or gift cards.',
  },
  {
    title: 'Trust Your Instincts',
    description: 'If something feels off, trust your gut. You can always walk away from a transaction.',
  },
  {
    title: 'Report Suspicious Activity',
    description: 'Report any suspicious listings or users immediately through our reporting system.',
  },
  {
    title: 'Keep Records',
    description: 'Save messages and transaction details. This helps if you need to report an issue later.',
  },
];

export default function SafetyPage() {
  return (
    <main className="bg-slate-50 dark:bg-[#111d21] min-h-screen py-16 px-6 font-display text-slate-900 dark:text-white transition-colors duration-300">
      <header className="max-w-4xl mx-auto text-center mb-16 px-4">
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight uppercase">Campus Safety Tips</h1>
        <p className="text-slate-500 font-medium bg-slate-100 dark:bg-white/5 inline-block px-4 py-1 rounded-full text-sm">Stay safe while buying and selling on campus</p>
      </header>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {safetyTips.map((tip, index) => (
          <div
            key={index}
            className="group bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-[2rem] p-8 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <div className="text-4xl font-black text-primary/20 mb-4 transition-colors group-hover:text-primary leading-none">{index + 1}</div>
            <h3 className="text-xl font-bold text-[#0e171b] dark:text-white mb-3">{tip.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{tip.description}</p>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto mt-20 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-[2.5rem] p-10 text-center">
        <h2 className="text-2xl font-black text-red-600 dark:text-red-400 mb-4 uppercase tracking-tight">Need Help?</h2>
        <p className="text-red-700/80 dark:text-red-300/80 font-medium max-w-2xl mx-auto leading-relaxed">
          If you encounter any issues or feel unsafe, contact campus security immediately.
          You can also report problems through our reporting system.
        </p>
      </div>
    </main>
  );
}
