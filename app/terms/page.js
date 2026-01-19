
export default function TermsPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Terms & Conditions</h1>
        <p className={styles.subtitle}>Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
          <p className={styles.text}>
            By accessing and using KART, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. User Accounts</h2>
          <p className={styles.text}>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Seller Subscriptions</h2>
          <p className={styles.text}>
            Sellers must maintain an active subscription to list products. Subscriptions auto-renew unless cancelled. Refunds are not available for partial subscription periods.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Prohibited Items</h2>
          <p className={styles.text}>
            You may not list illegal items, stolen goods, or items that violate campus policies. KART reserves the right to remove any listing at any time.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Transactions</h2>
          <p className={styles.text}>
            KART facilitates transactions but is not a party to the sale. All transactions are between buyers and sellers. We are not responsible for the quality, safety, or legality of items listed.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Limitation of Liability</h2>
          <p className={styles.text}>
            KART shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
          </p>
        </section>
      </div>
    </main>
  );
}
