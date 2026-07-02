import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient, createServiceRoleClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import TransactionTrends from './components/TransactionTrends';


export default async function AdminDashboard() {
    const supabase = await createClient();

    // 1. Auth & Admin Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Server-side Admin Verification (Security-in-depth)
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        redirect('/'); // Or a specialized unauthorized page
    }

    // 3. Fetch Platform Stats (Using Service Role to ensure admin sees all system data)
    const adminSupabase = createServiceRoleClient();

    let userCount = 0;
    let productCount = 0;
    let orderCount = 0;
    let activeSubscriptions = 0;
    let pendingVerifications = 0;
    let pendingReports = 0;
    let pendingRefunds = 0;
    let recentUsers = [];
    let recentListings = [];
    let recentOrders = [];
    let recentSubscriptions = [];
    let revenueData = [];
    let volumeData = [];
    let dbError = null;

    try {
        const [
            { count: fetchedUserCount },
            { count: fetchedProductCount },
            { count: fetchedOrderCount },
            { count: fetchedActiveSubscriptions },
            { count: fetchedPendingVerifications },
            { count: fetchedPendingReports },
            { count: fetchedPendingRefunds },
            { data: fetchedRecentUsers },
            { data: fetchedRecentListings },
            { data: fetchedRecentOrders },
            { data: fetchedRecentSubscriptions },
            { data: fetchedRevenueData },
            { data: fetchedVolumeData }
        ] = await Promise.all([
            adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
            adminSupabase.from('products').select('id', { count: 'exact', head: true }),
            adminSupabase.from('orders').select('id', { count: 'exact', head: true }),
            adminSupabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
            adminSupabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
            adminSupabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
            adminSupabase.from('refund_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
            adminSupabase.from('profiles').select('id, display_name, created_at, email').order('created_at', { ascending: false }).limit(3),
            adminSupabase.from('products').select('id, title, created_at, seller:profiles!seller_id(email)').order('created_at', { ascending: false }).limit(5),
            adminSupabase.from('orders').select('id, created_at, product:products(title), buyer:profiles!orders_buyer_id_profiles_fkey(email)').order('created_at', { ascending: false }).limit(3),
            adminSupabase.from('subscriptions').select('id, created_at, plan:subscription_plans(name), user:profiles!user_id(email)').order('created_at', { ascending: false }).limit(5),
            adminSupabase.from('orders').select('total_amount').in('status', ['Paid', 'Delivered', 'Completed']),
            adminSupabase.from('orders').select('total_amount, created_at')
        ]);

        userCount = fetchedUserCount || 0;
        productCount = fetchedProductCount || 0;
        orderCount = fetchedOrderCount || 0;
        activeSubscriptions = fetchedActiveSubscriptions || 0;
        pendingVerifications = fetchedPendingVerifications || 0;
        pendingReports = fetchedPendingReports || 0;
        pendingRefunds = fetchedPendingRefunds || 0;
        recentUsers = fetchedRecentUsers || [];
        recentListings = fetchedRecentListings || [];
        recentOrders = fetchedRecentOrders || [];
        recentSubscriptions = fetchedRecentSubscriptions || [];
        revenueData = fetchedRevenueData || [];
        volumeData = fetchedVolumeData || [];
    } catch (err) {
        console.error('Error fetching admin dashboard statistics:', err);
        dbError = err.message || 'Failed to fetch platform metrics from the database.';
    }

    const totalRevenue = revenueData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
    const totalVolume = volumeData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    // --- AGGREGATE DATA FOR TRENDS CHART ---
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const monthlyMap = {};
    const now = new Date();

    // Initialize monthly map with last 6 months in order
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyMap[months[d.getMonth()]] = 0;
    }

    // Initialize weekly chart data dynamically for the last 7 days ending today
    const weeklyChartData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        weeklyChartData.push({
            label: days[d.getDay()],
            val: 0,
            dateKey: d.toDateString()
        });
    }

    volumeData.forEach(order => {
        const date = new Date(order.created_at);
        const amount = parseFloat(order.total_amount || 0);

        // Group by Month (if within last 6 months)
        const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
            const monthLabel = months[date.getMonth()];
            if (monthlyMap[monthLabel] !== undefined) {
                monthlyMap[monthLabel] += amount;
            }
        }

        // Match for weekly data by exact date key to prevent duplication
        const dateKey = date.toDateString();
        const matchingDay = weeklyChartData.find(item => item.dateKey === dateKey);
        if (matchingDay) {
            matchingDay.val += amount;
        }
    });

    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = months[d.getMonth()];
        monthlyChartData.push({ label, val: monthlyMap[label] || 0 });
    }

    function formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    }

    const currentHour = new Date().getHours();
    let greeting = "Welcome back";
    if (currentHour < 12) greeting = "Good morning";
    else if (currentHour < 17) greeting = "Good afternoon";
    else greeting = "Good evening";

    // Unified Pulse Timeline aggregation
    const pulseItems = [
        ...recentOrders.map(order => ({
            id: `order-${order.id}`,
            type: 'order',
            title: order.product?.title || 'New Order Placed',
            subtitle: order.buyer?.email ? `@${order.buyer.email.split('@')[0]}` : 'buyer',
            date: new Date(order.created_at),
            icon: 'shopping_bag',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
            link: `/dashboard/admin/orders`
        })),
        ...recentUsers.map(user => ({
            id: `user-${user.id}`,
            type: 'user',
            title: user.display_name || 'New User Registered',
            subtitle: user.email ? `@${user.email.split('@')[0]}` : 'new member',
            date: new Date(user.created_at),
            icon: 'person_add',
            iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
            link: `/dashboard/admin/users`
        })),
        ...recentListings.map(prod => ({
            id: `listing-${prod.id}`,
            type: 'listing',
            title: prod.title || 'New Product Listed',
            subtitle: prod.seller?.email ? `@${prod.seller.email.split('@')[0]}` : 'seller',
            date: new Date(prod.created_at),
            icon: 'inventory_2',
            iconBg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
            link: `/dashboard/admin/products`
        })),
        ...recentSubscriptions.map(sub => ({
            id: `sub-${sub.id}`,
            type: 'subscription',
            title: `Subscribed to ${sub.plan?.name || 'membership'}`,
            subtitle: sub.user?.email ? `@${sub.user.email.split('@')[0]}` : 'member',
            date: new Date(sub.created_at),
            icon: 'card_membership',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
            link: `/dashboard/admin/subscriptions`
        }))
    ].sort((a, b) => b.date - a.date).slice(0, 8);
    // ----------------------------------------

    return (
        <div className="space-y-8 pb-12">
            {dbError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
                    <DynamicLucideIcon name="report_problem" size={20} />
                    <div>
                        <strong className="font-bold">Database Error:</strong> {dbError}
                    </div>
                </div>
            )}

            {/* Dashboard Welcome & Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 dark:border-primary/5 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        {greeting}, {profile?.display_name || user?.email?.split('@')[0] || 'Admin'}!
                    </h1>
                    <p className="text-sm text-[#4b636c] dark:text-gray-400 mt-1">Here is a live summary of your marketplace operations.</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-xs font-bold border border-emerald-500/20 w-fit shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    System Live & Healthy
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 cursor-default overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-10 sm:size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <DynamicLucideIcon name="groups" size={24} className="text-primary" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            +4.2% <span className="opacity-75">wk</span>
                        </span>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Users</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 text-gray-900 dark:text-white">{userCount.toLocaleString()}</h3>
                </div>

                <div className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300 cursor-default overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-10 sm:size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <DynamicLucideIcon name="verified" size={24} className="text-amber-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            +2.1% <span className="opacity-75">wk</span>
                        </span>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Subs</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 text-gray-900 dark:text-white">{activeSubscriptions.toLocaleString()}</h3>
                </div>

                <div className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 cursor-default overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-10 sm:size-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <DynamicLucideIcon name="inventory_2" size={24} className="text-indigo-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            +8.5% <span className="opacity-75">mo</span>
                        </span>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Listings</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 text-gray-900 dark:text-white">{productCount.toLocaleString()}</h3>
                </div>

                <div className="group relative bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 cursor-default overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-10 sm:size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <DynamicLucideIcon name="payments" size={24} className="text-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            +14.8% <span className="opacity-75">mo</span>
                        </span>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 text-gray-900 dark:text-white">₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TransactionTrends
                    totalRevenue={totalRevenue}
                    totalVolume={totalVolume}
                    monthlyData={monthlyChartData}
                    weeklyData={weeklyChartData}
                />

                {/* Right Sidebar Activity Feed */}
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col h-full overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black uppercase tracking-widest text-[#4b636c] dark:text-gray-400">Active Pulse</h4>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </div>
                    
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] px-1 custom-scrollbar scroll-smooth mb-6">
                        {pendingVerifications > 0 && (
                            <Link href="/dashboard/admin/verifications" className="flex gap-3 group border-b border-dashed border-gray-100 dark:border-gray-800/40 pb-3 items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] p-1.5 rounded-lg transition-all duration-200">
                                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-all">
                                    <DynamicLucideIcon name="verified_user" size={18} className="text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-[#111618] dark:text-gray-200"><span className="text-amber-600 dark:text-amber-400 font-extrabold">{pendingVerifications}</span> pending applications</p>
                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Needs review</p>
                                </div>
                            </Link>
                        )}

                        {pulseItems.length > 0 ? (
                            pulseItems.map(item => (
                                <Link key={item.id} href={item.link} className="flex gap-3 group items-center hover:bg-black/[0.02] dark:hover:bg-white/[0.02] p-1.5 rounded-lg transition-all duration-200">
                                    <div className={`size-9 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                                        <DynamicLucideIcon name={item.icon} size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-[#111618] dark:text-gray-200 truncate group-hover:text-primary transition-colors">{item.title}</p>
                                        <p className="text-[9px] font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-wider mt-0.5">{item.subtitle} • {formatRelativeTime(item.date)}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-12 text-center text-[#4b636c] dark:text-gray-500 text-xs">
                                <DynamicLucideIcon name="info" className="mx-auto text-lg opacity-40 mb-2" />
                                No activity recorded.
                            </div>
                        )}
                    </div>

                    <Link href="/dashboard/admin/users" className="w-full py-3 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-primary dark:hover:text-primary transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] mt-auto">
                        View Records
                    </Link>
                </div>
            </div>

            {/* Quick Actions Dashboard Grid */}
            <div className="p-4 sm:p-6 rounded-3xl border border-[#dce3e5]/60 dark:border-[#2d3b41]/60 bg-white/5 dark:bg-white/[0.02]">
                <h4 className="text-sm font-black uppercase tracking-widest text-[#4b636c] dark:text-gray-400 mb-6 px-1">Control Operations</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link href="/dashboard/admin/verifications" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/50 dark:hover:border-primary/50">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <DynamicLucideIcon name="pending_actions" className="text-8xl text-primary" />
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative">
                                <DynamicLucideIcon name="pending_actions" className="text-primary text-2xl" />
                                {pendingVerifications > 0 && <span className="absolute -top-1 -right-1 size-3 bg-primary rounded-full border-2 border-white dark:border-[#131d21] animate-pulse"></span>}
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1 text-gray-900 dark:text-white">{pendingVerifications} Pending</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Seller verifications</p>
                            <div className="mt-8 flex items-center text-primary font-bold text-[10px] uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                Manage Apps <DynamicLucideIcon name="arrow_forward" className="text-sm" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/admin/reports" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 hover:border-orange-500/50 dark:hover:border-orange-500/50">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <DynamicLucideIcon name="report_problem" className="text-8xl text-orange-500" />
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative">
                                <DynamicLucideIcon name="report_problem" className="text-orange-500 text-2xl" />
                                {pendingReports > 0 && <span className="absolute -top-1 -right-1 size-3 bg-orange-500 rounded-full border-2 border-white dark:border-[#131d21] animate-pulse"></span>}
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1 text-gray-900 dark:text-white">{pendingReports} Flagged</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Items to review</p>
                            <div className="mt-8 flex items-center text-orange-500 font-bold text-[10px] uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                Investigate <DynamicLucideIcon name="arrow_forward" className="text-sm" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/admin/orders" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1 hover:border-green-500/50 dark:hover:border-green-500/50">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <DynamicLucideIcon name="account_balance_wallet" className="text-8xl text-green-500" />
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative">
                                <DynamicLucideIcon name="account_balance_wallet" className="text-green-500 text-2xl" />
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1 text-gray-900 dark:text-white">{orderCount} Total</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Orders in system</p>
                            <div className="mt-8 flex items-center text-green-500 font-bold text-[10px] uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                All Ledgers <DynamicLucideIcon name="arrow_forward" className="text-sm" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/admin/refund-requests" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10 hover:-translate-y-1 hover:border-red-500/50 dark:hover:border-red-500/50">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <DynamicLucideIcon name="keyboard_return" className="text-8xl text-red-500" />
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative">
                                <DynamicLucideIcon name="keyboard_return" className="text-red-500 text-2xl" />
                                {pendingRefunds > 0 && <span className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full border-2 border-white dark:border-[#131d21] animate-pulse"></span>}
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1 text-gray-900 dark:text-white">{pendingRefunds} Pending</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Refund requests</p>
                            <div className="mt-8 flex items-center text-red-500 font-bold text-[10px] uppercase tracking-widest gap-2 opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                                Review Disputes <DynamicLucideIcon name="arrow_forward" className="text-sm" />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );

}
