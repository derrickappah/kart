
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
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Campus Safety Tips</h1>
        <p className={styles.subtitle}>Stay safe while buying and selling on campus</p>
      </header>

      <div className={styles.tipsGrid}>
        {safetyTips.map((tip, index) => (
          <div key={index} className={styles.tipCard}>
            <div className={styles.tipNumber}>{index + 1}</div>
            <h3 className={styles.tipTitle}>{tip.title}</h3>
            <p className={styles.tipDescription}>{tip.description}</p>
          </div>
        ))}
      </div>

      <div className={styles.emergency}>
        <h2 className={styles.emergencyTitle}>Need Help?</h2>
        <p className={styles.emergencyText}>
          If you encounter any issues or feel unsafe, contact campus security immediately.
          You can also report problems through our reporting system.
        </p>
      </div>
    </main>
  );
}
