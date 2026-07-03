import { createClient, createServiceRoleClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
    const supabase = await createClient();

    // 1. Auth & Admin Access Check (Security-in-depth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        redirect('/'); // Redirect if not authorized
    }

    // 2. Instantiate Admin Supabase Client (bypassing RLS for system-wide stats)
    const adminSupabase = createServiceRoleClient();

    let fetchedUsers = [];
    let fetchedProducts = [];
    let fetchedOrders = [];
    let fetchedSubscriptions = [];
    let fetchedAdvertisements = [];
    let fetchedVerifications = [];
    let fetchedReports = [];
    let fetchedWithdrawals = [];
    let dbError = null;

    try {
        const [
            { data: usersResult, error: errU },
            { data: productsResult, error: errP },
            { data: ordersResult, error: errO },
            { data: subscriptionsResult, error: errS },
            { data: advertisementsResult, error: errA },
            { data: verificationsResult, error: errV },
            { data: reportsResult, error: errR },
            { data: withdrawalsResult, error: errW }
        ] = await Promise.all([
            adminSupabase.from('profiles').select('id, created_at, campus, banned, is_admin'),
            adminSupabase.from('products').select('id, created_at, category, status, views_count, likes_count, shares_count, campus'),
            adminSupabase.from('orders').select('id, created_at, total_amount, status, product_id'),
            adminSupabase.from('subscriptions').select('id, created_at, status, plan:subscription_plans(price, name)'),
            adminSupabase.from('advertisements').select('id, created_at, status, cost, views, clicks'),
            adminSupabase.from('verification_requests').select('id, created_at, status'),
            adminSupabase.from('reports').select('id, created_at, status'),
            adminSupabase.from('withdrawal_requests').select('id, created_at, status, amount')
        ]);

        if (errU || errP || errO || errS || errA || errV || errR || errW) {
            throw new Error(
                [errU, errP, errO, errS, errA, errV, errR, errW]
                    .filter(Boolean)
                    .map(e => e.message)
                    .join(' | ')
            );
        }

        fetchedUsers = usersResult || [];
        fetchedProducts = productsResult || [];
        fetchedOrders = ordersResult || [];
        fetchedSubscriptions = subscriptionsResult || [];
        fetchedAdvertisements = advertisementsResult || [];
        fetchedVerifications = verificationsResult || [];
        fetchedReports = reportsResult || [];
        fetchedWithdrawals = withdrawalsResult || [];
    } catch (err) {
        console.error('Error fetching admin analytics database details:', err);
        dbError = err.message || 'Failed to fetch analytics datasets from the database.';
    }

    // --- KPI Aggregations ---
    const totalUsers = fetchedUsers.length;
    const activeUsers = fetchedUsers.filter(u => !u.banned).length;

    const totalListings = fetchedProducts.length;
    const activeListings = fetchedProducts.filter(p => p.status === 'Active').length;

    const completedOrders = fetchedOrders.filter(o => ['Completed', 'Delivered'].includes(o.status));
    const gtv = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const escrowAmount = fetchedOrders.filter(o => o.status === 'Paid').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

    const activeSubscriptionsCount = fetchedSubscriptions.filter(s => s.status === 'Active').length;
    const subRevenue = fetchedSubscriptions.filter(s => s.status === 'Active').reduce((sum, s) => sum + parseFloat(s.plan?.price || 0), 0);
    const adRevenue = fetchedAdvertisements.reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);
    const totalRevenue = subRevenue + adRevenue; // Platform direct revenue

    // --- Trends (Monthly - Last 6 Months) ---
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyTrends = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyTrends.push({
            year: d.getFullYear(),
            monthIndex: d.getMonth(),
            label: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
            gtv: 0,
            registrations: 0,
            adRevenue: 0,
            subRevenue: 0
        });
    }

    // Populate Monthly Trends
    fetchedOrders.forEach(o => {
        if (!['Paid', 'Delivered', 'Completed'].includes(o.status)) return;
        const d = new Date(o.created_at);
        const match = monthlyTrends.find(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
        if (match) {
            match.gtv += parseFloat(o.total_amount || 0);
        }
    });

    fetchedUsers.forEach(u => {
        const d = new Date(u.created_at);
        const match = monthlyTrends.find(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
        if (match) {
            match.registrations++;
        }
    });

    fetchedAdvertisements.forEach(a => {
        const d = new Date(a.created_at);
        const match = monthlyTrends.find(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
        if (match) {
            match.adRevenue += parseFloat(a.cost || 0);
        }
    });

    fetchedSubscriptions.forEach(s => {
        const d = new Date(s.created_at);
        const match = monthlyTrends.find(m => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
        if (match) {
            match.subRevenue += parseFloat(s.plan?.price || 0);
        }
    });

    // --- Trends (Weekly - Last 7 Days) ---
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTrends = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        weeklyTrends.push({
            dateString: d.toDateString(),
            label: days[d.getDay()],
            gtv: 0,
            registrations: 0,
            adRevenue: 0,
            subRevenue: 0
        });
    }

    // Populate Weekly Trends
    fetchedOrders.forEach(o => {
        if (!['Paid', 'Delivered', 'Completed'].includes(o.status)) return;
        const key = new Date(o.created_at).toDateString();
        const match = weeklyTrends.find(item => item.dateString === key);
        if (match) {
            match.gtv += parseFloat(o.total_amount || 0);
        }
    });

    fetchedUsers.forEach(u => {
        const key = new Date(u.created_at).toDateString();
        const match = weeklyTrends.find(item => item.dateString === key);
        if (match) {
            match.registrations++;
        }
    });

    fetchedAdvertisements.forEach(a => {
        const key = new Date(a.created_at).toDateString();
        const match = weeklyTrends.find(item => item.dateString === key);
        if (match) {
            match.adRevenue += parseFloat(a.cost || 0);
        }
    });

    fetchedSubscriptions.forEach(s => {
        const key = new Date(s.created_at).toDateString();
        const match = weeklyTrends.find(item => item.dateString === key);
        if (match) {
            match.subRevenue += parseFloat(s.plan?.price || 0);
        }
    });

    // --- Category Distribution ---
    const categoryMap = {};
    fetchedProducts.forEach(p => {
        const cat = p.category || 'Uncategorized';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categoryDistribution = Object.entries(categoryMap).map(([category, count]) => ({
        category,
        count,
        percentage: totalListings > 0 ? ((count / totalListings) * 100).toFixed(1) : 0
    })).sort((a, b) => b.count - a.count);

    // --- Campus Leaderboard ---
    const campusMap = {};
    
    // Aggregate users by campus
    fetchedUsers.forEach(u => {
        const campus = u.campus || 'Main Campus';
        if (!campusMap[campus]) {
            campusMap[campus] = { campus, userCount: 0, productCount: 0, revenue: 0 };
        }
        campusMap[campus].userCount++;
    });

    // Aggregate products by campus
    fetchedProducts.forEach(p => {
        const campus = p.campus || 'Main Campus';
        if (!campusMap[campus]) {
            campusMap[campus] = { campus, userCount: 0, productCount: 0, revenue: 0 };
        }
        campusMap[campus].productCount++;
    });

    // Map product IDs to campuses for order revenue calculation
    const productCampusMap = {};
    fetchedProducts.forEach(p => {
        productCampusMap[p.id] = p.campus || 'Main Campus';
    });

    // Aggregate order revenue by campus
    fetchedOrders.forEach(o => {
        if (!['Paid', 'Delivered', 'Completed'].includes(o.status)) return;
        const campus = productCampusMap[o.product_id] || 'Main Campus';
        if (!campusMap[campus]) {
            campusMap[campus] = { campus, userCount: 0, productCount: 0, revenue: 0 };
        }
        campusMap[campus].revenue += parseFloat(o.total_amount || 0);
    });

    // Sort leaderboard by combined activity (users + listings)
    const campusLeaderboard = Object.values(campusMap).sort((a, b) => 
        (b.userCount + b.productCount) - (a.userCount + a.productCount)
    );

    // --- Engagement Aggregations ---
    const totalViews = fetchedProducts.reduce((sum, p) => sum + (p.views_count || 0), 0);
    const totalLikes = fetchedProducts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalShares = fetchedProducts.reduce((sum, p) => sum + (p.shares_count || 0), 0);

    // --- Ad Campaigns Analytics ---
    const activeAdsCount = fetchedAdvertisements.filter(a => a.status === 'Active').length;
    const totalAdSpend = fetchedAdvertisements.reduce((sum, a) => sum + parseFloat(a.cost || 0), 0);
    const totalAdViews = fetchedAdvertisements.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalAdClicks = fetchedAdvertisements.reduce((sum, a) => sum + (a.clicks || 0), 0);
    const adCtr = totalAdViews > 0 ? ((totalAdClicks / totalAdViews) * 100).toFixed(2) : 0;

    // --- Moderation status ---
    const verificationsCount = fetchedVerifications.length;
    const verificationsApproved = fetchedVerifications.filter(v => v.status === 'Approved').length;
    const verificationsPending = fetchedVerifications.filter(v => v.status === 'Pending').length;
    const verificationsRejected = fetchedVerifications.filter(v => v.status === 'Rejected').length;
    const verificationApprovalRate = verificationsCount > 0 
        ? ((verificationsApproved / verificationsCount) * 100).toFixed(1)
        : 0;

    const reportsCount = fetchedReports.length;
    const reportsPending = fetchedReports.filter(r => r.status === 'Pending').length;
    const reportsResolved = fetchedReports.filter(r => r.status === 'Resolved').length;

    // --- Rich Analytics Additions ---
    // 1. Subscription Plans Tier Distribution
    const planDistributionMap = {};
    fetchedSubscriptions.forEach(s => {
        if (s.status !== 'Active') return;
        const name = s.plan?.name || 'Standard Plan';
        planDistributionMap[name] = (planDistributionMap[name] || 0) + 1;
    });
    const planDistribution = Object.entries(planDistributionMap).map(([name, value]) => ({ name, value }));

    // 2. Order Lifecycle Statuses Breakdown
    const orderStatusMap = {
        'Pending': 0,
        'Paid': 0,
        'Shipped': 0,
        'Delivered': 0,
        'Completed': 0,
        'Cancelled': 0,
        'Refunded': 0
    };
    fetchedOrders.forEach(o => {
        const status = o.status || 'Pending';
        if (orderStatusMap[status] !== undefined) {
            orderStatusMap[status]++;
        } else {
            orderStatusMap[status] = 1;
        }
    });
    const orderStatusDistribution = Object.entries(orderStatusMap).map(([status, count]) => ({ status, count }));

    // 3. Cashflow (Withdrawals) Analytics
    const totalWithdrawalsCount = fetchedWithdrawals.length;
    const approvedWithdrawalsCount = fetchedWithdrawals.filter(w => w.status === 'Approved').length;
    const pendingWithdrawalsCount = fetchedWithdrawals.filter(w => w.status === 'Pending').length;
    const approvedWithdrawalVolume = fetchedWithdrawals.filter(w => w.status === 'Approved').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
    const pendingWithdrawalVolume = fetchedWithdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

    // 4. Compliance Audits
    const bannedUsersCount = fetchedUsers.filter(u => u.banned).length;
    const bannedProductsCount = fetchedProducts.filter(p => p.status === 'Banned').length;

    return (
        <div className="space-y-6">
            {dbError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
                    <strong>Warning:</strong> {dbError}
                </div>
            )}
            
            <AnalyticsClient 
                kpis={{
                    gtv,
                    escrowAmount,
                    subRevenue,
                    adRevenue,
                    totalRevenue,
                    totalUsers,
                    activeUsers,
                    totalListings,
                    activeListings
                }}
                trends={{
                    monthly: monthlyTrends,
                    weekly: weeklyTrends
                }}
                categoryDistribution={categoryDistribution}
                campusLeaderboard={campusLeaderboard}
                engagement={{
                    views: totalViews,
                    likes: totalLikes,
                    shares: totalShares
                }}
                ads={{
                    total: fetchedAdvertisements.length,
                    active: activeAdsCount,
                    revenue: totalAdSpend,
                    views: totalAdViews,
                    clicks: totalAdClicks,
                    ctr: adCtr
                }}
                moderation={{
                    verifications: {
                        total: verificationsCount,
                        approved: verificationsApproved,
                        pending: verificationsPending,
                        rejected: verificationsRejected,
                        approvalRate: verificationApprovalRate
                    },
                    reports: {
                        total: reportsCount,
                        pending: reportsPending,
                        resolved: reportsResolved
                    }
                }}
                planDistribution={planDistribution}
                orderStatusDistribution={orderStatusDistribution}
                cashflows={{
                    totalCount: totalWithdrawalsCount,
                    approvedCount: approvedWithdrawalsCount,
                    pendingCount: pendingWithdrawalsCount,
                    approvedVolume: approvedWithdrawalVolume,
                    pendingVolume: pendingWithdrawalVolume
                }}
                compliance={{
                    bannedUsers: bannedUsersCount,
                    bannedProducts: bannedProductsCount
                }}
            />
        </div>
    );
}
