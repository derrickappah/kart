
export default function AboutPage() {
    return (
        <main className={styles.container}>
            {/* Hero Section */}
            <div className={styles.hero} style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2000')` }}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>Empowering Campus Commerce</h1>
                    <p className={styles.heroSubtitle}>Connecting students. Simplifying exchange. Building community.</p>
                </div>
            </div>

            {/* Mission Section */}
            <section className={styles.section}>
                <div className={styles.missionGrid}>
                    <div>
                        <h2 className={styles.sectionTitle}>Our Mission</h2>
                        <p className={styles.text}>
                            Founded in 2024, KART was born from a simple observation: university students need a safer, easier, and more reliable way to buy and sell within their community.
                        </p>
                        <p className={styles.text}>
                            Current solutions were either too broad, unsafe, or cluttered. KART provides a specialized platform tailored to the unique needs of campus life—whether it's finding affordable textbooks, selling furniture at the end of the semester, or discovering student-made crafts.
                        </p>
                    </div>
                    <div>
                        <div className={styles.statGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statNumber}>5k+</div>
                                <div className={styles.statLabel}>Students</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statNumber}>12k+</div>
                                <div className={styles.statLabel}>Listings</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statNumber}>$500k</div>
                                <div className={styles.statLabel}>Saved</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className={styles.section} style={{ background: 'var(--surface-highlight)', borderRadius: 'var(--radius-lg)' }}>
                <h2 className={styles.sectionTitle} style={{ textAlign: 'center' }}>Meet the Team</h2>
                <div className={styles.teamGrid}>
                    <div className={styles.teamCard}>
                        <img
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
                            alt="Team Member"
                            className={styles.teamImage}
                        />
                        <div className={styles.teamInfo}>
                            <h3 className={styles.teamName}>David Chen</h3>
                            <p className={styles.teamRole}>Founder & CEO</p>
                            <p className={styles.teamBio}>CS Major. Built the first version of KART in his dorm room to help friends sell textbooks.</p>
                        </div>
                    </div>

                    <div className={styles.teamCard}>
                        <img
                            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
                            alt="Team Member"
                            className={styles.teamImage}
                        />
                        <div className={styles.teamInfo}>
                            <h3 className={styles.teamName}>Sarah Johnson</h3>
                            <p className={styles.teamRole}>Head of Design</p>
                            <p className={styles.teamBio}>Design student passionate about creating intuitive and beautiful user experiences.</p>
                        </div>
                    </div>

                    <div className={styles.teamCard}>
                        <img
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
                            alt="Team Member"
                            className={styles.teamImage}
                        />
                        <div className={styles.teamInfo}>
                            <h3 className={styles.teamName}>Marcus Williams</h3>
                            <p className={styles.teamRole}>Lead Engineer</p>
                            <p className={styles.teamBio}>Full-stack wizard ensuring KART runs smoothly and securely for everyone.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className={styles.section} style={{ textAlign: 'center' }}>
                <h2 className={styles.sectionTitle}>Get in Touch</h2>
                <p className={styles.text} style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
                    Have questions or feedback? We'd love to hear from you. Reach out to our team directly.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <a href="mailto:support@kart.com" style={{
                        padding: '1rem 2rem',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '600',
                        textDecoration: 'none'
                    }}>
                        Email Support
                    </a>
                    <a href="#" style={{
                        padding: '1rem 2rem',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: '600',
                        textDecoration: 'none'
                    }}>
                        Follow on Social
                    </a>
                </div>
            </section>
        </main>
    );
}
