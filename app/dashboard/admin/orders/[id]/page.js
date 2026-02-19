import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EscrowManagementClient from '../EscrowManagementClient';
import OrderStatusManager from '../OrderStatusManager';

export default async function AdminOrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Fetch order with related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, description, images, image_url, category, condition),
      buyer:profiles!orders_buyer_id_profiles_fkey(id, display_name, email, is_verified),
      seller:profiles!orders_seller_id_profiles_fkey(id, display_name, email, is_verified)
    `)
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-12 rounded-3xl border border-[#dce3e5] dark:border-[#2d3b41] text-center max-w-md w-full shadow-2xl">
          <div className="size-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">receipt_long</span>
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tighter uppercase">Record Not Found</h1>
          <p className="text-[#4b636c] mb-8 text-[11px] font-black uppercase tracking-widest">The transaction record you are looking for does not exist or has been archived.</p>
          <Link
            href="/dashboard/admin/orders"
            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Ledger
          </Link>
        </div>
      </div>
    );
  }

  // Fetch status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:profiles!order_status_history_changed_by_fkey(display_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const productImage = order.product?.images?.[0] || order.product?.image_url;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/orders"
          className="flex items-center gap-2 text-[#4b636c] hover:text-primary transition-colors text-xs font-black uppercase tracking-widest group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Ledger
        </Link>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">print</span>
            Invoice
          </button>
          <button className="px-4 py-2 rounded-xl bg-white/70 dark:bg-[#182125]/70 border border-[#dce3e5] dark:border-[#2d3b41] text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Data Export
          </button>
        </div>
      </div>


      {/* Escrow Hub */}
      <EscrowManagementClient order={order} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Intelligence Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Product Detail Card */}
          <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
            <div className="p-1 responsive-aspect-square md:aspect-[21/9] bg-gray-100 dark:bg-[#212b30] relative overflow-hidden group">
              {productImage ? (
                <Image src={productImage} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              ) : (
                <div className="size-full flex items-center justify-center text-[#4b636c]/20">
                  <span className="material-symbols-outlined text-8xl">box</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                <h2 className="text-2xl font-black text-white tracking-tight">{order.product?.title || 'Unknown Item'}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">category</span>
                    {order.product?.category || 'General'}
                  </span>
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    {order.product?.condition || 'Standard'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-4">Item Analytics</h3>
              <p className="text-[#4b636c] dark:text-gray-400 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                {order.product?.description || 'No detailed description provided for this marketplace listing.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="bg-background-light dark:bg-[#212b30] px-4 py-3 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex-1 min-w-[140px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Quantity</p>
                  <p className="text-xl font-black">{order.quantity} Units</p>
                </div>
                <div className="bg-background-light dark:bg-[#212b30] px-4 py-3 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] flex-1 min-w-[140px]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Unit Value</p>
                  <p className="text-xl font-black text-primary uppercase tracking-tighter">GH₵ {parseFloat(order.unit_price || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Audit Trail */}
          <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
            <div className="px-8 py-6 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Audit Timeline</h3>
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#212b30] text-[9px] font-black uppercase">{statusHistory?.length || 0} Events</span>
            </div>
            <div className="p-8">
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-[#dce3e5] dark:before:bg-[#2d3b41]">
                {statusHistory?.map((history, i) => (
                  <div key={history.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1.5 size-[24px] rounded-full border-4 border-white dark:border-[#182125] flex items-center justify-center ${i === 0 ? 'bg-primary shadow-[0_0_15px_rgba(29,173,221,0.5)]' : 'bg-[#4b636c]'
                      }`}>
                      <div className="size-1.5 rounded-full bg-white"></div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                      <h4 className={`text-[11px] font-black uppercase tracking-[0.1em] ${i === 0 ? 'text-primary' : 'text-[#4b636c]'}`}>
                        {history.new_status}
                      </h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">{new Date(history.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-[#4b636c] font-black uppercase tracking-tight leading-relaxed">
                      {history.notes || `Order status transition from ${history.old_status || 'Initial'} to ${history.new_status}.`}
                    </p>
                    {history.changed_by_user && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black">
                          {history.changed_by_user.display_name?.charAt(0) || 'A'}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#4b636c]">Managed by {history.changed_by_user.display_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Intelligence Column */}
        <div className="space-y-8">
          {/* Financial Breakdown */}
          <div className="bg-[#111618] text-white rounded-2xl p-8 shadow-xl shadow-primary/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-6">Settlement Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-white/60">Gross Sale Price</span>
                <span>GH₵ {(parseFloat(order.unit_price || 0) * order.quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-white/60">App Service Fee (Buyer)</span>
                <span className="text-blue-400">+ GH₵ {(parseFloat(order.total_amount || 0) - (parseFloat(order.unit_price || 0) * order.quantity)).toFixed(2)}</span>
              </div>
              <div className="h-px bg-white/5 my-2"></div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-white/60">Seller Commission ({order.platform_fee_percentage || 0}%)</span>
                <span className="text-red-400">- GH₵ {(parseFloat(order.platform_fee_total || 0) - (parseFloat(order.total_amount || 0) - (parseFloat(order.unit_price || 0) * order.quantity))).toFixed(2)}</span>
              </div>

              <div className="h-px bg-white/10 my-6"></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-1">Total Paid</p>
                  <p className="text-2xl font-black tracking-tighter">GH₵ {parseFloat(order.total_amount || 0).toFixed(2)}</p>
                </div>
                <div className="bg-primary/10 rounded-xl p-4 border border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">App Revenue</p>
                  <p className="text-2xl font-black text-primary tracking-tighter">GH₵ {parseFloat(order.platform_fee_total || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-4 bg-green-500/5 rounded-xl p-4 border border-green-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-500/70 mb-1">Seller Final Payout</p>
                <div className="flex items-center justify-between">
                  <p className="text-xl font-black text-green-400 uppercase tracking-tighter">GH₵ {parseFloat(order.seller_payout_amount || 0).toFixed(2)}</p>
                  <span className="material-symbols-outlined text-green-400">payments</span>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Profiles */}
          <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden">
            <div className="p-6 border-b border-[#dce3e5] dark:border-[#2d3b41]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Transaction Parties</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">B</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Buyer Account</p>
                  <p className="text-xs font-black uppercase tracking-tight truncate">{order.buyer?.display_name || 'Anonymous'}</p>
                  <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest truncate">{order.buyer?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center font-black">S</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">Seller Account</p>
                    {order.seller?.is_verified && (
                      <span className="material-symbols-outlined text-[12px] text-primary">verified</span>
                    )}
                  </div>
                  <p className="text-xs font-black uppercase tracking-tighter truncate">{order.seller?.display_name || 'Anonymous'}</p>
                  <p className="text-[9px] text-[#4b636c] font-black uppercase tracking-widest truncate">{order.seller?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Override Controller */}
          <OrderStatusManager order={order} />

          {/* Technical Metadata */}
          <div className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4b636c] mb-4">Transaction Meta</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-[#4b636c]">Created At</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-[#4b636c]">Ref ID</span>
                <span className="truncate max-w-[120px]">{order.payment_reference || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-[#4b636c]">Bank ID</span>
                <span className="truncate max-w-[120px]">{order.paystack_transaction_id || 'N/A'}</span>
              </div>
              {order.escrow_released_at && (
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-[#4b636c] text-green-500">Released At</span>
                  <span className="text-green-500">{new Date(order.escrow_released_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
