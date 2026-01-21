import { createClient } from '../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminAccessCheck from './AdminAccessCheck';

export default async function AdminDashboard() {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Note: Admin access check is handled by AdminAccessCheck client component
    // This allows real-time verification and bypasses server-side cache issues

    // 3. Fetch Platform Stats (Parallel)
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
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('*, seller:profiles!seller_id(email)').order('created_at', { ascending: false }).limit(10),
        supabase.from('orders').select('*, product:products(title), buyer:profiles!orders_buyer_id_profiles_fkey(email)').order('created_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('*, plan:subscription_plans(name), user:profiles!user_id(email)').order('created_at', { ascending: false }).limit(5)
    ]);

    // Calculate total revenue from completed orders
    const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'Completed');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

    return (
        <AdminAccessCheck>
            <div className="space-y-8 pb-12">
                {/* KPI Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] transition-transform cursor-default">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">groups</span>
                            </div>
                            <span className="text-[#078836] bg-[#078836]/10 px-2 py-1 rounded-lg text-xs font-bold">+12%</span>
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Users</p>
                        <h3 className="text-3xl font-bold mt-1">{userCount || 0}</h3>
                        <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: '75%' }}></div>
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] hover:scale-[1.02] transition-transform cursor-default">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">verified</span>
                            </div>
                            <span className="text-[#078836] bg-[#078836]/10 px-2 py-1 rounded-lg text-xs font-bold">+5%</span>
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Active Subscriptions</p>
                        <h3 className="text-3xl font-bold mt-1">{activeSubscriptions || 0}</h3>
                        <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: '42%' }}></div>
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] transition-transform cursor-default">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">inventory_2</span>
                            </div>
                            <span className="text-[#078836] bg-[#078836]/10 px-2 py-1 rounded-lg text-xs font-bold">+8%</span>
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Active Listings</p>
                        <h3 className="text-3xl font-bold mt-1">{productCount || 0}</h3>
                        <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: '68%' }}></div>
                        </div>
                    </div>

                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d393e] hover:scale-[1.02] transition-transform cursor-default">
                        <div className="flex justify-between items-start mb-4">
                            <div className="size-12 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl">payments</span>
                            </div>
                            <span className="text-[#078836] bg-[#078836]/10 px-2 py-1 rounded-lg text-xs font-bold">+15%</span>
                        </div>
                        <p className="text-[#4b636c] dark:text-gray-400 text-sm font-semibold uppercase tracking-wider">Total Revenue</p>
                        <h3 className="text-3xl font-bold mt-1">₵{totalRevenue.toFixed(0)}</h3>
                        <div className="mt-4 h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: '89%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Activity Chart Placeholder */}
                    <div className="lg:col-span-2 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-8 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h4 className="text-xl font-bold">Transaction Trends</h4>
                                <p className="text-sm text-[#4b636c]">Live marketplace volume from across campuses</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold">Monthly</button>
                                <button className="px-4 py-1.5 rounded-lg text-[#4b636c] text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Weekly</button>
                            </div>
                        </div>
                        <div className="relative w-full h-[280px] flex items-end justify-between gap-4">
                            {/* Dummy Graph visualization using Tailwind */}
                            <div className="w-full h-48 bg-primary/10 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-primary/30 h-2/3 rounded-t-lg transition-all group-hover:h-[80%]"></div>
                            </div>
                            <div className="w-full h-56 bg-primary/10 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-primary/30 h-3/4 rounded-t-lg transition-all group-hover:h-[90%]"></div>
                            </div>
                            <div className="w-full h-40 bg-primary/10 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-primary/30 h-1/2 rounded-t-lg transition-all group-hover:h-[60%]"></div>
                            </div>
                            <div className="w-full h-64 bg-primary/10 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-primary/30 h-[85%] rounded-t-lg transition-all group-hover:h-[95%]"></div>
                            </div>
                            <div className="w-full h-52 bg-primary/10 rounded-t-lg relative group">
                                <div className="absolute bottom-0 w-full bg-primary/30 h-3/5 rounded-t-lg transition-all group-hover:h-[75%]"></div>
                            </div>
                            <div className="w-full h-72 bg-primary rounded-t-lg relative group shadow-[0_0_20px_rgba(25,175,225,0.3)]">
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#111618] text-white text-[10px] px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">Peak: ₵{totalRevenue.toFixed(0)}</div>
                            </div>
                        </div>
                        <div className="flex justify-between mt-4 text-[#4b636c] text-xs font-bold uppercase tracking-widest">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                        </div>
                    </div>

                    {/* Right Sidebar Activity Feed */}
                    <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold">Real-time Activity</h4>
                            <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                        </div>
                        <div className="flex flex-col gap-6">
                            {recentOrders?.map(order => (
                                <div key={order.id} className="flex gap-4 group">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                        <span className="material-symbols-outlined text-primary text-xl">shopping_bag</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-[#111618] dark:text-gray-200 truncate group-hover:text-primary transition-colors"><span className="font-black">{order.product?.title || 'Product'}</span> purchased</p>
                                        <p className="text-[10px] font-bold text-[#4b636c] dark:text-gray-400 mt-1 uppercase tracking-tighter transition-all">@{order.buyer?.email?.split('@')[0]} • {new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}

                            {pendingVerifications > 0 && (
                                <div className="flex gap-4 group">
                                    <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                        <span className="material-symbols-outlined text-amber-500 text-xl">verified_user</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-[#111618] dark:text-gray-200"><span className="font-black text-amber-600">{pendingVerifications}</span> pending applications</p>
                                        <p className="text-[10px] font-bold text-[#4b636c] dark:text-gray-400 mt-1 uppercase tracking-tighter">Requires audit attention</p>
                                    </div>
                                </div>
                            )}

                            {recentUsers?.map(user => (
                                <div key={user.id} className="flex gap-4 group">
                                    <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                                        <span className="material-symbols-outlined text-green-500 text-xl">person_add</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-[#111618] dark:text-gray-200 truncate group-hover:text-green-600 transition-colors"><span className="font-black">{user.display_name || 'New User'}</span> joined platform</p>
                                        <p className="text-[10px] font-bold text-[#4b636c] dark:text-gray-400 mt-1 uppercase tracking-tighter">{new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link href="/dashboard/admin/users" className="w-full py-3 text-center text-[10px] font-black uppercase tracking-widest text-[#4b636c] hover:text-[#111618] dark:hover:text-white transition-colors border-t border-[#dce3e5] dark:border-[#2d3b41] mt-auto">
                            View Executive Roster
                        </Link>
                    </div>
                </div>

                {/* Quick Actions / Bottom Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/dashboard/admin/verifications" className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between group cursor-pointer hover:bg-primary/5 transition-colors border-l-4 border-primary">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-primary text-3xl">pending_actions</span>
                            <div>
                                <p className="text-lg font-black tracking-tight">{pendingVerifications} Pending</p>
                                <p className="text-xs font-bold text-[#4b636c] uppercase tracking-wider">Seller verifications</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-[#4b636c] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>

                    <Link href="/dashboard/admin/reports" className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between group cursor-pointer hover:bg-orange-500/5 transition-colors border-l-4 border-orange-500">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-orange-500 text-3xl">report_problem</span>
                            <div>
                                <p className="text-lg font-black tracking-tight">{pendingReports} Flagged</p>
                                <p className="text-xs font-bold text-[#4b636c] uppercase tracking-wider">Items to review</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-[#4b636c] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>

                    <Link href="/dashboard/admin/orders" className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between group cursor-pointer hover:bg-green-500/5 transition-colors border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <span className="material-symbols-outlined text-green-500 text-3xl">account_balance_wallet</span>
                            <div>
                                <p className="text-lg font-black tracking-tight">{orderCount} Total</p>
                                <p className="text-xs font-bold text-[#4b636c] uppercase tracking-wider">Orders in system</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-[#4b636c] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </AdminAccessCheck>
    );

}
