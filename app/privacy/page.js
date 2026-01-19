
export default function PrivacyPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.subtitle}>Last updated: {new Date().toLocaleDateString()}</p>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Information We Collect</h2>
          <p className={styles.text}>
            We collect information you provide directly to us, including your name, email address, student ID (for verification), and payment information.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. How We Use Your Information</h2>
          <p className={styles.text}>
            We use your information to provide, maintain, and improve our services, process transactions, send notifications, and verify seller accounts.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Information Sharing</h2>
          <p className={styles.text}>
            We do not sell your personal information. We may share information with service providers who assist us in operating our platform, subject to confidentiality agreements.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Security</h2>
          <p className={styles.text}>
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Your Rights</h2>
          <p className={styles.text}>
            You have the right to access, update, or delete your personal information. Contact us at support@kart.com to exercise these rights.
          </p>
        </section>
      </div>
    </main>
  );
}
