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
            <div className="min-h-screen bg-gray-50 dark:bg-[#1a1c23] p-4 md:p-8">
                <header className="mb-8 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z"/>
                            </svg>
                            ADMIN MODE
                        </span>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Users', value: userCount },
                        { label: 'Total Listings', value: productCount },
                        { label: 'Total Orders', value: orderCount },
                        { label: 'Platform Revenue', value: `₵${totalRevenue.toFixed(2)}` },
                        { label: 'Active Subscriptions', value: activeSubscriptions },
                        { label: 'Pending Verifications', value: pendingVerifications },
                        { label: 'Pending Reports', value: pendingReports }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#2d2d32] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</h3>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value || 0}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                        { href: '/dashboard/admin/verifications', label: 'Verifications', desc: 'Review requests', icon: 'verified' },
                        { href: '/dashboard/admin/subscriptions', label: 'Subscriptions', desc: 'Manage plans', icon: 'subscriptions' },
                        { href: '/dashboard/admin/orders', label: 'Orders', desc: 'Manage escrow', icon: 'shopping_bag' },
                        { href: '/dashboard/admin/reports', label: 'Reports', desc: 'Review reports', icon: 'report' },
                        { href: '/dashboard/admin/advertisements', label: 'Ads', desc: 'Manage ads', icon: 'campaign' },
                        { href: '/dashboard/admin/reviews', label: 'Reviews', desc: 'Moderate feedback', icon: 'star' }
                    ].map((action, i) => (
                        <Link key={i} href={action.href} className="flex flex-col p-4 bg-white dark:bg-[#2d2d32] rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-[#1daddd] dark:hover:border-[#1daddd] transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-[#1daddd]/10 flex items-center justify-center text-[#1daddd] mb-3 group-hover:bg-[#1daddd] group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined">{action.icon}</span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{action.label}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.desc}</p>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Users */}
                    <div className="bg-white dark:bg-[#2d2d32] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Newest Users</h3>
                            <Link href="/dashboard/admin/users" className="text-xs font-bold text-[#1daddd]">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {recentUsers?.map(u => (
                                <div key={u.id} className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-500">
                                        {u.display_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{u.display_name || 'No Name'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white dark:bg-[#2d2d32] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Recent Orders</h3>
                            <Link href="/dashboard/admin/orders" className="text-xs font-bold text-[#1daddd]">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {recentOrders?.map(order => (
                                <div key={order.id} className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                                        <span className="material-symbols-outlined">shopping_basket</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{order.product?.title || 'Product'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">by {order.buyer?.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">₵{parseFloat(order.total_amount || 0).toFixed(0)}</p>
                                        <p className={`text-[10px] font-black uppercase ${order.status === 'Completed' ? 'text-green-500' : 'text-amber-500'}`}>{order.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Subscriptions */}
                    <div className="bg-white dark:bg-[#2d2d32] rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Recent Subscriptions</h3>
                            <Link href="/dashboard/admin/subscriptions" className="text-xs font-bold text-[#1daddd]">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {recentSubscriptions?.map(sub => (
                                <div key={sub.id} className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                        <span className="material-symbols-outlined">card_membership</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{sub.plan?.name || 'Plan'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub.user?.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${sub.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminAccessCheck>
    );
}
