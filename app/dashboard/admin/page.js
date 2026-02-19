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

    const [
        { count: userCount },
        { count: productCount },
        { count: orderCount },
        { count: activeSubscriptions },
        { count: pendingVerifications },
        { count: pendingReports },
        { data: recentUsers },
        { data: recentListings },
        { data: recentOrders },
        { data: recentSubscriptions }
    ] = await Promise.all([
        adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
        adminSupabase.from('products').select('id', { count: 'exact', head: true }),
        adminSupabase.from('orders').select('id', { count: 'exact', head: true }),
        adminSupabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        adminSupabase.from('verification_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
        adminSupabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
        adminSupabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }).limit(3),
        adminSupabase.from('products').select('id, title, created_at, seller:profiles!seller_id(email)').order('created_at', { ascending: false }).limit(5),
        adminSupabase.from('orders').select('id, created_at, product:products(title), buyer:profiles!orders_buyer_id_profiles_fkey(email)').order('created_at', { ascending: false }).limit(3),
        adminSupabase.from('subscriptions').select('id, created_at, plan:subscription_plans(name), user:profiles!user_id(email)').order('created_at', { ascending: false }).limit(5)
    ]);

    // Calculate total revenue from successful orders (Paid, Delivered, or Completed)
    const { data: revenueData } = await adminSupabase
        .from('orders')
        .select('total_amount')
        .in('status', ['Paid', 'Delivered', 'Completed']);

    // Calculate total marketplace volume (including Pending) for the Trends chart
    const { data: volumeData } = await adminSupabase
        .from('orders')
        .select('total_amount, created_at');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;
    const totalVolume = volumeData?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    // --- AGGREGATE DATA FOR TRENDS CHART ---
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const monthlyMap = {};
    const weeklyMap = {};

    // Initialize maps
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyMap[months[d.getMonth()]] = 0;
    }
    days.forEach(day => weeklyMap[day] = 0);

    volumeData?.forEach(order => {
        const date = new Date(order.created_at);
        const amount = parseFloat(order.total_amount || 0);

        // Group by Month (if within last 6 months)
        const monthLabel = months[date.getMonth()];
        if (monthlyMap[monthLabel] !== undefined) {
            monthlyMap[monthLabel] += amount;
        }

        // Group by Day of Week (if within last 7 days)
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
            weeklyMap[days[date.getDay()]] += amount;
        }
    });

    const monthlyChartData = Object.entries(monthlyMap).map(([label, val]) => ({ label, val }));
    const weeklyChartData = days.map(day => ({ label: day, val: weeklyMap[day] }));
    // ----------------------------------------

    return (
        <div className="space-y-6 pb-8">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">groups</span>
                        </div>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Users</p>
                    <h3 className="text-3xl font-bold mt-1">{userCount || 0}</h3>
                </div>

                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">verified</span>
                        </div>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Active Subscriptions</p>
                    <h3 className="text-3xl font-bold mt-1">{activeSubscriptions || 0}</h3>
                </div>

                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">inventory_2</span>
                        </div>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Active Listings</p>
                    <h3 className="text-3xl font-bold mt-1">{productCount || 0}</h3>
                </div>

                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] transition-transform cursor-default">
                    <div className="flex justify-between items-start mb-4">
                        <div className="size-12 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl">payments</span>
                        </div>
                    </div>
                    <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-3xl font-bold mt-1">₵{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h3>
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
                <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-base font-black uppercase tracking-tight">Active Pulse</h4>
                        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] px-1 custom-scrollbar scroll-smooth">
                        {recentOrders?.map(order => (
                            <div key={order.id} className="flex gap-3 group items-center">
                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <span className="material-symbols-outlined text-primary text-base">shopping_bag</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#111618] dark:text-gray-200 truncate group-hover:text-primary transition-colors">{order.product?.title || 'Product'}</p>
                                    <p className="text-[9px] font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-tighter opacity-70">@{order.buyer?.email?.split('@')[0]} • {new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}

                        {pendingVerifications > 0 && (
                            <div className="flex gap-3 group border-y border-gray-100 dark:border-gray-800/20 py-3 items-center">
                                <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                    <span className="material-symbols-outlined text-amber-500 text-base">verified_user</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-[#111618] dark:text-gray-200"><span className="text-amber-600">{pendingVerifications}</span> pending apps</p>
                                    <p className="text-[9px] font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-tighter opacity-70">Needs review</p>
                                </div>
                            </div>
                        )}

                        {recentUsers?.map(user => (
                            <div key={user.id} className="flex gap-3 group items-center">
                                <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                                    <span className="material-symbols-outlined text-green-500 text-base">person_add</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[#111618] dark:text-gray-200 truncate group-hover:text-green-600 transition-colors">{user.display_name || 'New User'}</p>
                                    <p className="text-[9px] font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-tighter opacity-70">{new Date(user.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Link href="/dashboard/admin/users" className="w-full py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-[#111618] dark:hover:text-white transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] mt-auto">
                        View Records
                    </Link>
                </div>
            </div>

            {/* Redesigned Quick Actions Grid */}
            <div className="p-2 rounded-3xl border border-[#dce3e5]/60 dark:border-[#2d3b41]/60 bg-white/5 dark:bg-white/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/admin/verifications" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 hover:border-primary/50 dark:hover:border-primary/50">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <span className="material-symbols-outlined text-8xl text-primary">pending_actions</span>
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative">
                                <span className="material-symbols-outlined text-primary text-2xl">pending_actions</span>
                                {pendingVerifications > 0 && <span className="absolute -top-1 -right-1 size-3 bg-primary rounded-full border-2 border-white dark:border-[#131d21] animate-pulse"></span>}
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1">{pendingVerifications} Pending</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Seller verifications</p>
                            <div className="mt-8 flex items-center text-primary font-bold text-[10px] uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                Manage Apps <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/admin/reports" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 hover:border-orange-500/50 dark:hover:border-orange-500/50">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <span className="material-symbols-outlined text-8xl text-orange-500">report_problem</span>
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative">
                                <span className="material-symbols-outlined text-orange-500 text-2xl">report_problem</span>
                                {pendingReports > 0 && <span className="absolute -top-1 -right-1 size-3 bg-orange-500 rounded-full border-2 border-white dark:border-[#131d21] animate-pulse"></span>}
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1">{pendingReports} Flagged</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Items to review</p>
                            <div className="mt-8 flex items-center text-orange-500 font-bold text-[10px] uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                Investigate <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/admin/orders" className="group relative bg-white/40 dark:bg-[#131d21]/40 backdrop-blur-xl p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1 hover:border-green-500/50 dark:hover:border-green-500/50">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 origin-top-right translate-x-4 -translate-y-4">
                            <span className="material-symbols-outlined text-8xl text-green-500">account_balance_wallet</span>
                        </div>
                        <div className="flex flex-col h-full relative z-10">
                            <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform relative">
                                <span className="material-symbols-outlined text-green-500 text-2xl">account_balance_wallet</span>
                            </div>
                            <h4 className="text-2xl font-black tracking-tight mb-1">{orderCount} Total</h4>
                            <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">Orders in system</p>
                            <div className="mt-8 flex items-center text-green-500 font-bold text-[10px] uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                All Ledgers <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );

}
