import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import OrderPaymentVerification from './OrderPaymentVerification';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';

export const dynamic = 'force-dynamic';

// Refined Order Detail Page Component
export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch order with related data
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      product:products(id, title, description, images, image_url, category, condition),
      buyer:profiles!orders_buyer_id_profiles_fkey(id, display_name, email, is_verified, avatar_url),
      seller:profiles!orders_seller_id_profiles_fkey(id, display_name, email, is_verified, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (orderError || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-rounded text-red-500 text-3xl">error</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-gray-400 mb-8 max-w-xs">The order you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/orders" className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors font-medium">
          Back to Orders
        </Link>
      </div>
    );
  }

  // Check if user has access to this order
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.is_admin;

  if (!isBuyer && !isSeller && !isAdmin) {
    redirect('/dashboard/orders');
  }

  // Fetch status history
  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:profiles!order_status_history_changed_by_fkey(display_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: false });

  const productImage = order.product?.images?.[0] || order.product?.image_url;

  const statusConfig = {
    'Pending': { icon: 'schedule', color: '#F59E0B', label: 'Payment Pending' },
    'Paid': { icon: 'check_circle', color: '#10B981', label: 'Order Paid' },
    'Shipped': { icon: 'local_shipping', color: '#3B82F6', label: 'Item Shipped' },
    'Delivered': { icon: 'package_2', color: '#8B5CF6', label: 'Delivered' },
    'Completed': { icon: 'verified', color: '#10B981', label: 'Completed' },
    'Cancelled': { icon: 'cancel', color: '#EF4444', label: 'Cancelled' }
  };

  const currentStatus = statusConfig[order.status] || { icon: 'help', color: '#6B7280', label: order.status };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#131d1f] text-[#0e181b] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] min-h-screen antialiased">
      {/* Mobile-optimized centered container */}
      <div className="max-w-[430px] mx-auto min-h-screen flex flex-col relative pb-32 bg-[#f6f7f8] dark:bg-[#131d1f]">

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center bg-[#f6f7f8]/80 dark:bg-[#131d1f]/80 backdrop-blur-md p-4 justify-between border-b border-gray-100 dark:border-gray-800">
          <Link
            href={isBuyer ? '/dashboard/orders' : '/dashboard/seller/orders'}
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          </Link>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-lg font-bold">Order Details</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        <main className="flex flex-col gap-6 p-4">
          {/* Payment Verification Banner */}
          {isBuyer && order.status === 'Pending' && (
            <Suspense fallback={null}>
              <OrderPaymentVerification orderId={order.id} currentStatus={order.status} />
            </Suspense>
          )}

          {/* Status Timeline Card */}
          <section className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)] overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="material-symbols-outlined text-6xl" style={{ color: currentStatus.color }}>{currentStatus.icon}</span>
            </div>

            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-6">Current Status</h2>

            <div className="flex items-center gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: `${currentStatus.color}15`, border: `1px solid ${currentStatus.color}30` }}
              >
                <span className="material-symbols-outlined text-3xl" style={{ color: currentStatus.color }}>{currentStatus.icon}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: currentStatus.color }}>{currentStatus.label}</h3>
                <p className="text-xs text-gray-400">Updated {new Date(order.updated_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Simple Timeline Preview */}
            <div className="space-y-4">
              {statusHistory?.slice(0, 3).map((history, i) => (
                <div key={history.id} className="flex gap-4 relative">
                  {i < Math.min(statusHistory.length - 1, 2) && (
                    <div className="absolute left-[7px] top-4 w-[1px] h-full bg-gray-100 dark:bg-gray-800" />
                  )}
                  <div className="w-4 h-4 rounded-full border-2 border-white dark:border-[#1e292b] mt-1 relative z-10" style={{ backgroundColor: statusConfig[history.new_status]?.color || '#6B7280' }} />
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-bold">{history.new_status}</p>
                    <p className="text-[10px] text-gray-400">{new Date(history.created_at).toLocaleString()}</p>
                    {history.notes && <p className="text-xs text-gray-400 mt-1 italic opacity-80">"{history.notes}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Product Information */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">Order Summary</h2>
            <div className="bg-white dark:bg-[#1e292b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)] flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-700">
                {productImage ? (
                  <img src={productImage} alt={order.product?.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400">image</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 overflow-hidden">
                <span className="text-[10px] text-[#1daddd] uppercase font-bold tracking-widest mb-1">{order.product?.category}</span>
                <h3 className="font-bold text-base leading-tight mb-1 truncate">{order.product?.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Qty: {order.quantity}</span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <span className="text-xs text-gray-400 font-medium">{order.product?.condition}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Price Breakdown */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">Price Details</h2>
            <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)] space-y-4 divide-y divide-gray-50 dark:divide-gray-800/50">
              <div className="space-y-3 pb-4">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-400">Price</span>
                  <span>GHS {parseFloat(order.unit_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-400">Platform Fee</span>
                  <span>GHS {parseFloat(order.platform_fee_total).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Total Amount</p>
                  <p className="text-2xl font-black text-[#1daddd]">GHS {parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
                <div className="bg-[#1daddd]/10 px-3 py-1.5 rounded-full border border-[#1daddd]/20">
                  <span className="text-[10px] text-[#1daddd] font-bold uppercase tracking-tight">
                    Paid via {
                      (order.paystack_transaction_id ||
                        order.payment_reference?.startsWith('order_') ||
                        order.status === 'Pending' ||
                        parseFloat(order.seller_payout_amount) !== parseFloat(order.unit_price) * (order.quantity || 1))
                        ? 'Paystack'
                        : 'Wallet'
                    }
                  </span>
                </div>
              </div>

              {isSeller && (
                <div className="mt-4 pt-4">
                  <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/10 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Payout</span>
                    <span className="text-lg font-black text-[#42B883]">GHS {parseFloat(order.seller_payout_amount).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* User Info (Buyer/Seller) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
              {isBuyer ? 'Seller Details' : 'Buyer Details'}
            </h2>
            <div className="bg-white dark:bg-[#1e292b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                {(isBuyer ? order.seller : order.buyer)?.avatar_url ? (
                  <img src={(isBuyer ? order.seller : order.buyer).avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#1daddd]/10">
                    <span className="material-symbols-outlined text-[#1daddd]">person</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h3 className="font-bold truncate text-sm">{(isBuyer ? order.seller : order.buyer).display_name || 'User'}</h3>
                  {(isBuyer ? order.seller : order.buyer).is_verified && (
                    <span className="material-symbols-outlined text-primary text-[16px] fill-current">verified</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate font-medium font-mono">{(isBuyer ? order.seller : order.buyer).email}</p>
              </div>
              <Link
                href={`/profile/${(isBuyer ? order.seller : order.buyer).id}`}
                className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <span className="material-symbols-outlined text-xl text-[#1daddd]">chevron_right</span>
              </Link>
            </div>
          </section>

          {/* Safety Banner */}
          <div className="bg-[#e9f7fb] dark:bg-[#1daddd]/10 p-4 rounded-2xl border border-[#1daddd]/20 flex gap-3">
            <span className="material-symbols-outlined text-[#1daddd] shrink-0">verified_user</span>
            <p className="text-[#4f8596] dark:text-[#1daddd]/90 text-sm leading-snug font-medium">
              <span className="font-bold">Safety Note:</span> Your funds are held securely in escrow and only released once you confirm the handover.
            </p>
          </div>

          {/* Confirm Delivery Button - Only for buyers with paid/shipped orders */}
          {isBuyer && (order.status === 'Paid' || order.status === 'Shipped') && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">Confirm Receipt</h2>
              <div className="bg-white dark:bg-[#1e292b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-[0px_4px_12px_rgba(0,0,0,0.03)]">
                <div className="mb-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#1daddd] text-2xl shrink-0">local_shipping</span>
                  <div>
                    <h3 className="font-bold text-base mb-1">Received Your Item?</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Once you've received and inspected your item, confirm delivery to release payment to the seller.
                    </p>
                  </div>
                </div>
                <ConfirmDeliveryButton orderId={order.id} orderStatus={order.status} />
              </div>
            </section>
          )}

        </main>
      </div>

      {/* Global CSS for Material Symbols and Inter */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block" />
    </div>
  );
}
