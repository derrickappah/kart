import Link from 'next/link';
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export default async function SellPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch subscription plans
    const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('duration_months', { ascending: true });

    // Fetch user's current subscription if logged in (case-insensitive status check)
    let currentSubscription = null;
    let isSubscribed = false;
    let daysUntilExpiry = 0;
    if (user) {
        // Get all subscriptions and find active one (case-insensitive)
        const { data: allSubscriptions } = await supabase
            .from('subscriptions')
            .select('*, plan:subscription_plans(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        // Find active subscription (case-insensitive status check)
        currentSubscription = allSubscriptions?.find(sub => 
            (sub.status === 'Active' || sub.status === 'active') && 
            new Date(sub.end_date) > new Date()
        );

        isSubscribed = !!currentSubscription;
        
        // If user has an active subscription, redirect to seller dashboard
        if (isSubscribed) {
            redirect('/dashboard/seller');
        }

        if (currentSubscription) {
            daysUntilExpiry = Math.ceil((new Date(currentSubscription.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        }
    }

    // Fallback plans if database doesn't have them yet
    const defaultPlans = [
        { id: 'monthly', name: 'Monthly', price: 10, duration_months: 1, features: ['Unlimited listings', 'Seller dashboard', 'Basic analytics'] },
        { id: '6month', name: '6-Month', price: 50, duration_months: 6, features: ['Unlimited listings', 'Seller dashboard', 'Basic analytics', 'Featured seller badge', 'Priority support'] },
        { id: 'yearly', name: 'Yearly', price: 100, duration_months: 12, features: ['Unlimited listings', 'Seller dashboard', 'Basic analytics', 'Featured seller badge', 'Priority support', 'Maximum visibility', 'Early feature access'] },
    ];

    const displayPlans = plans && plans.length > 0 ? plans : defaultPlans;

    return (
        <main className={styles.main}>
            {isSubscribed ? (
                // Active Subscription View
                <>
                    <section className={styles.hero}>
                        <div className={styles.content}>
                            <h1 className={styles.title}>You're All Set to <span className={styles.highlight}>Start Selling!</span></h1>
                            <p className={styles.subtitle}>
                                Your subscription is active. Create your first listing and start earning today.
                            </p>
                            <div className={styles.actions}>
                                <Link href="/dashboard/seller/create" className={styles.ctaPrimary}>
                                    Create New Listing
                                </Link>
                                <Link href="/dashboard/seller" className={styles.ctaSecondary}>Go to Seller Dashboard</Link>
                            </div>
                        </div>
                    </section>

                    {/* Subscription Status Card */}
                    <section className={styles.plans} style={{ marginTop: '2rem' }}>
                        <div style={{
                            maxWidth: '800px',
                            margin: '0 auto',
                            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                            border: '2px solid #10b981',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2rem',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '1.5rem' }}>✅</span>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#065f46', margin: 0 }}>
                                            Active Subscription
                                        </h2>
                                    </div>
                                    <p style={{ color: '#047857', margin: '0.5rem 0', fontSize: '1rem' }}>
                                        <strong>Plan:</strong> {currentSubscription?.plan?.name || 'Active Plan'}
                                    </p>
                                    <p style={{ color: '#047857', margin: '0.5rem 0', fontSize: '1rem' }}>
                                        <strong>Expires:</strong> {new Date(currentSubscription.end_date).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                    <p style={{ color: '#047857', margin: '0.5rem 0', fontSize: '1rem' }}>
                                        <strong>Days Remaining:</strong> {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                                    </p>
                                </div>
                                {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                                    <div style={{ textAlign: 'right' }}>
                                        <Link href="#upgrade" className={styles.ctaPrimary} style={{ 
                                            display: 'inline-block',
                                            background: '#f59e0b',
                                            textDecoration: 'none',
                                        }}>
                                            Renew Now
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Upgrade/Renew Section - Only show prominently if expiring soon */}
                    {daysUntilExpiry <= 7 ? (
                        <section id="upgrade" className={styles.plans} style={{ marginTop: '3rem' }}>
                            <h2 className={styles.plansTitle} style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                Renew or Upgrade Your Subscription
                            </h2>
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                                Your subscription expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}. Renew now to continue selling without interruption.
                            </p>
                            {plansError && (
                                <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto 2rem' }}>
                                    <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
                                        ⚠️ Please run the subscription_schema.sql file in your Supabase SQL editor to set up subscription plans.
                                    </p>
                                </div>
                            )}
                            <div className={styles.plansGrid}>
                                {displayPlans?.map((plan) => {
                                    const isPopular = plan.duration_months === 12;
                                    const isCurrentPlan = currentSubscription?.plan_id === plan.id;
                                    
                                    return (
                                        <div key={plan.id} className={`${styles.plan} ${isPopular ? styles.planPopular : ''}`}>
                                            {isPopular && <div className={styles.badge}>Best Value ⭐</div>}
                                            <h3 className={styles.planName}>
                                                {plan.duration_months === 1 ? '🟢 Monthly Plan' : 
                                                 plan.duration_months === 6 ? '🔵 6-Month Plan' : 
                                                 '🟣 Yearly Plan'}
                                            </h3>
                                            <div className={styles.price}>
                                                ₵{plan.price}
                                                {plan.duration_months === 1 && <span className={styles.period}> / month</span>}
                                                {plan.duration_months === 6 && <span className={styles.period}> / 6 months</span>}
                                                {plan.duration_months === 12 && <span className={styles.period}> / year</span>}
                                            </div>
                                            <ul className={styles.planFeatures}>
                                                {plan.features?.map((feature, idx) => (
                                                    <li key={idx}>✓ {feature}</li>
                                                ))}
                                            </ul>
                                            {isCurrentPlan ? (
                                                <button className={styles.planButtonOutline} disabled>
                                                    Current Plan
                                                </button>
                                            ) : (
                                                <Link href="/subscription" className={styles.planButtonPrimary}>
                                                    {plan.duration_months === 12 ? 'Choose Plan' : 'Subscribe Now'}
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ) : (
                        // Simple "Manage Subscription" section when not expiring soon
                        <section style={{ marginTop: '2rem', textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Need to upgrade or manage your subscription?
                            </p>
                            <Link 
                                href="/dashboard/seller" 
                                style={{ 
                                    color: 'var(--primary)', 
                                    textDecoration: 'underline',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Go to Seller Dashboard to manage subscription
                            </Link>
                        </section>
                    )}
                </>
            ) : (
                // Non-Subscriber View (Current View)
                <>
                    <section className={styles.hero}>
                        <div className={styles.content}>
                            <h1 className={styles.title}>Turn Your Campus Stuff into <span className={styles.highlight}>Cash</span></h1>
                            <p className={styles.subtitle}>
                                The easiest way to sell textbooks, electronics, and furniture to students on your campus.
                            </p>
                            <div className={styles.actions}>
                                <a href="#plans" className={styles.ctaPrimary}>
                                    {user ? "Choose a Plan & Start Selling" : "Start Selling Now"}
                                </a>
                                <Link href="/marketplace" className={styles.ctaSecondary}>Explore Marketplace</Link>
                            </div>
                        </div>
                    </section>

                    <section id="benefits" className={styles.features}>
                        <div className={styles.featureGrid}>
                            <div className={styles.feature}>
                                <div className={styles.icon}>🔒</div>
                                <h3>Safe & Verified</h3>
                                <p>Only verified students can buy and sell. No strangers, just classmates.</p>
                            </div>
                            <div className={styles.feature}>
                                <div className={styles.icon}>⚡</div>
                                <h3>Super Fast</h3>
                                <p>List an item in under 60 seconds. Get messages instantly.</p>
                            </div>
                            <div className={styles.feature}>
                                <div className={styles.icon}>🤝</div>
                                <h3>No Fees</h3>
                                <p>Keep 100% of what you earn. No hidden commission fees.</p>
                            </div>
                        </div>
                    </section>

                    {/* Subscription Plans */}
                    <section id="plans" className={styles.plans}>
                <h2 className={styles.plansTitle}>Seller Subscription Plans (Required)</h2>
                {plansError && (
                    <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto 2rem' }}>
                        <p style={{ color: '#92400e', fontSize: '0.875rem' }}>
                            ⚠️ Please run the subscription_schema.sql file in your Supabase SQL editor to set up subscription plans.
                        </p>
                    </div>
                )}
                <div className={styles.plansGrid}>
                    {displayPlans?.map((plan) => {
                        const isPopular = plan.duration_months === 12;
                        const isCurrentPlan = currentSubscription?.plan_id === plan.id && isSubscribed;
                        
                        return (
                            <div key={plan.id} className={`${styles.plan} ${isPopular ? styles.planPopular : ''}`}>
                                {isPopular && <div className={styles.badge}>Best Value ⭐</div>}
                                <h3 className={styles.planName}>
                                    {plan.duration_months === 1 ? '🟢 Monthly Plan' : 
                                     plan.duration_months === 6 ? '🔵 6-Month Plan' : 
                                     '🟣 Yearly Plan'}
                                </h3>
                                <div className={styles.price}>
                                    ₵{plan.price}
                                    {plan.duration_months === 1 && <span className={styles.period}> / month</span>}
                                    {plan.duration_months === 6 && <span className={styles.period}> / 6 months</span>}
                                    {plan.duration_months === 12 && <span className={styles.period}> / year</span>}
                                </div>
                                <ul className={styles.planFeatures}>
                                    {plan.features?.map((feature, idx) => (
                                        <li key={idx}>✓ {feature}</li>
                                    ))}
                                </ul>
                                {!user ? (
                                    <Link href="/signup" className={styles.planButtonPrimary} style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
                                        Sign Up to Subscribe
                                    </Link>
                                ) : isCurrentPlan ? (
                                    <button className={styles.planButtonOutline} disabled>
                                        Current Plan
                                    </button>
                                ) : (
                                    <Link href="/subscription" className={styles.planButtonPrimary}>
                                        {plan.duration_months === 12 ? 'Choose Plan' : 'Subscribe Now'}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

                    {/* Subscription Rules */}
                    <section className={styles.rulesSection} style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto', background: 'var(--surface-highlight)', borderRadius: 'var(--radius-lg)' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', textAlign: 'center' }}>Subscription Rules</h2>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                            <li style={{ color: 'var(--text-main)', fontSize: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                                Auto-renew (optional) - You can enable or disable auto-renewal in your dashboard
                            </li>
                            <li style={{ color: 'var(--text-main)', fontSize: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                                Expiry reminders - We'll notify you 3 days before your subscription expires
                            </li>
                            <li style={{ color: 'var(--text-main)', fontSize: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                                Grace period - You have a 7-day grace period after expiry to renew
                            </li>
                            <li style={{ color: 'var(--text-main)', fontSize: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                                Selling disabled on expiry - Your listings will be hidden until you renew
                            </li>
                        </ul>
                    </section>
                </>
            )}
        </main>
    );
}
