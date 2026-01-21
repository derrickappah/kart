import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminOrdersPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Await searchParams for Next.js 15+
  const resolvedSearchParams = await searchParams;
  const escrowFilter = resolvedSearchParams?.escrow || 'all';

  let query = supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, images, image_url),
      buyer:profiles!orders_buyer_id_profiles_fkey(display_name, email),
      seller:profiles!orders_seller_id_profiles_fkey(display_name, email)
    `)
    .order('created_at', { ascending: false });

  if (escrowFilter !== 'all') {
    query = query.eq('escrow_status', escrowFilter);
  }

  const { data: orders, error } = await query;

  // Calculate stats
  const totalCount = orders?.length || 0;
  const heldCount = orders?.filter(o => o.escrow_status === 'Held').length || 0;
  const releasedCount = orders?.filter(o => o.escrow_status === 'Released').length || 0;
  const refundedCount = orders?.filter(o => o.escrow_status === 'Refunded').length || 0;
  const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0;

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return styles.statusPending;
      case 'Paid': return styles.statusPaid;
      case 'Shipped': return styles.statusShipped;
      case 'Delivered': return styles.statusDelivered;
      case 'Completed': return styles.statusCompleted;
      case 'Cancelled': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };

  const getEscrowClass = (escrowStatus) => {
    switch (escrowStatus) {
      case 'Held': return styles.escrowHeld;
      case 'Released': return styles.escrowReleased;
      case 'Refunded': return styles.escrowRefunded;
      default: return styles.escrowHeld;
    }
  };

  return (
    <div className="space-y-8">

      {/* Financial Pulse Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Platform Volume', value: `GH₵ ${totalRevenue.toLocaleString()}`, color: 'primary', icon: 'account_balance_wallet' },
          { label: 'Escrow Lock', value: heldCount, color: 'amber-500', icon: 'lock' },
          { label: 'Total Orders', value: totalCount, color: 'green-500', icon: 'shopping_cart' },
          { label: 'Refunded', value: refundedCount, color: 'red-500', icon: 'keyboard_return' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-5 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41]">
            <div className="flex items-center gap-4">
              <div className={`size-10 rounded-lg bg-${stat.color}/10 text-${stat.color} flex items-center justify-center`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div>
                <p className="text-[#4b636c] dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <h4 className="text-xl font-black tracking-tighter uppercase">{stat.value || 0}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Control Bar */}
      <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex items-center gap-2 overflow-x-auto">
        {[
          { label: 'All Transactions', value: 'all', icon: 'receipt_long' },
          { label: 'Held in Escrow', value: 'Held', icon: 'lock_person' },
          { label: 'Released', value: 'Released', icon: 'money_forward' },
          { label: 'Refunded', value: 'Refunded', icon: 'history_edu' },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'all' ? '/dashboard/admin/orders' : `/dashboard/admin/orders?escrow=${tab.value}`}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${escrowFilter === tab.value
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-[#4b636c] hover:bg-primary/5'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium">
          Error loading orders: {error.message}
        </div>
      )}

      {/* Transaction Ledger */}
      <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-[#212b30]/50 text-[#4b636c] text-[10px] font-black uppercase tracking-widest border-b border-[#dce3e5] dark:border-[#2d3b41]">
              <th className="px-6 py-4">Transaction Details</th>
              <th className="px-6 py-4">Buyer / Seller</th>
              <th className="px-6 py-4">Financials</th>
              <th className="px-6 py-4">Escrow State</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dce3e5] dark:divide-[#2d3b41]">
            {orders?.map((order) => {
              const productImage = order.product?.images?.[0] || order.product?.image_url;
              return (
                <tr key={order.id} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-gray-100 dark:bg-[#212b30] flex-shrink-0 relative overflow-hidden group/img">
                        {productImage ? (
                          <img src={productImage} alt="" className="size-full object-cover group-hover/img:scale-110 transition-transform" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-[#4b636c]/30">
                            <span className="material-symbols-outlined text-2xl">package</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold group-hover:text-primary transition-colors max-w-[180px] truncate">{order.product?.title || 'Unknown Item'}</p>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase mt-0.5 tracking-widest">ID: {order.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#4b636c] uppercase w-10">Buyer:</span>
                        <span className="text-xs font-bold truncate max-w-[140px] uppercase tracking-tighter">{order.buyer?.display_name || 'No Name'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#4b636c] uppercase w-10">Seller:</span>
                        <span className="text-xs font-bold truncate max-w-[140px] uppercase tracking-tighter">{order.seller?.display_name || 'No Name'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-primary">GH₵ {parseFloat(order.total_amount || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{order.quantity} x Item</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase w-fit ${order.status === 'Paid' ? 'bg-green-500/10 text-green-500' :
                        order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                        {order.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase w-fit ${order.escrow_status === 'Held' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                        order.escrow_status === 'Released' ? 'bg-primary/10 text-primary' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                        {order.escrow_status || 'NOT SET'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/dashboard/admin/orders/${order.id}`}
                        className="size-10 rounded-xl bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20"
                      >
                        <span className="material-symbols-outlined">payments</span>
                      </Link>
                      <button className="size-10 rounded-xl bg-background-light dark:bg-[#212b30] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors border border-[#dce3e5] dark:border-[#2d3b41] hover:border-primary/20">
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!orders || orders.length === 0) && (
          <div className="p-12 text-center text-[#4b636c]">
            <span className="material-symbols-outlined text-5xl opacity-20 mb-2">receipt_long</span>
            <p className="text-[11px] font-black uppercase tracking-widest">No transactions recorded for this filter</p>
          </div>
        )}
      </div>

      {/* Pagination Placeholder */}
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">Showing <span className="text-[#111618] dark:text-white">1-{orders?.length || 0}</span> of <span className="text-[#111618] dark:text-white">{totalCount}</span> transactions</p>
        <div className="flex gap-2">
          <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="size-10 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-center text-[#4b636c] hover:text-primary transition-colors disabled:opacity-50" disabled>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  );
}
