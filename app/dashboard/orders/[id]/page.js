import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import OrderPaymentVerification from './OrderPaymentVerification';
import ConfirmDeliveryButton from './ConfirmDeliveryButton';
import RefundButton from './RefundButton';
import MarkAsShippedButton from './MarkAsShippedButton';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

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
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#0d1517] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-5 border border-red-500/20">
          <DynamicLucideIcon name="search_off" className="text-red-400 text-4xl" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Order Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs text-sm leading-relaxed">
          The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link
          href="/dashboard/orders"
          className="px-6 py-3 bg-white dark:bg-[#1e292b] border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  const isAdmin = profile?.is_admin;

  if (!isBuyer && !isSeller && !isAdmin) redirect('/dashboard/orders');

  const { data: statusHistory } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:profiles!order_status_history_changed_by_fkey(display_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const productImage = order.product?.images?.[0] || order.product?.image_url;

  const statusConfig = {
    'Pending':   { icon: 'schedule',        color: '#F59E0B', bg: '#FEF3C7', darkBg: 'rgba(245,158,11,0.12)',  label: 'Payment Pending',  step: 0 },
    'Paid':      { icon: 'payments',        color: '#10B981', bg: '#D1FAE5', darkBg: 'rgba(16,185,129,0.12)',  label: 'Order Paid',       step: 1 },
    'Shipped':   { icon: 'local_shipping',  color: '#3B82F6', bg: '#DBEAFE', darkBg: 'rgba(59,130,246,0.12)',  label: 'Item Shipped',     step: 2 },
    'Delivered': { icon: 'package_2',       color: '#8B5CF6', bg: '#EDE9FE', darkBg: 'rgba(139,92,246,0.12)',  label: 'Delivered',        step: 3 },
    'Completed': { icon: 'verified',        color: '#10B981', bg: '#D1FAE5', darkBg: 'rgba(16,185,129,0.12)',  label: 'Completed',        step: 3 },
    'Cancelled': { icon: 'cancel',          color: '#EF4444', bg: '#FEE2E2', darkBg: 'rgba(239,68,68,0.12)',   label: 'Cancelled',        step: -1 },
    'Refunded':  { icon: 'keyboard_return', color: '#EF4444', bg: '#FEE2E2', darkBg: 'rgba(239,68,68,0.12)',   label: 'Refunded',         step: -1 },
  };

  const STEPS = ['Pending', 'Paid', 'Shipped', 'Delivered'];

  const normalizedStatus = order.status
    ? order.status.charAt(0).toUpperCase() + order.status.slice(1).toLowerCase()
    : 'Pending';
  const orderStatus = normalizedStatus;
  const currentStatus = statusConfig[orderStatus] || { icon: 'help', color: '#6B7280', bg: '#F3F4F6', darkBg: 'rgba(107,114,128,0.12)', label: order.status, step: 0 };

  const counterparty = isBuyer ? order.seller : order.buyer;
  const counterpartyRole = isBuyer ? 'Seller' : 'Buyer';

  const paymentMethod = order.paystack_transaction_id || order.payment_reference?.startsWith('wallet_')
    ? (order.paystack_transaction_id ? 'Paystack' : 'Wallet')
    : 'Paystack';

  const isCancelled = orderStatus === 'Cancelled' || orderStatus === 'Refunded';
  const currentStep = currentStatus.step ?? 0;

  return (
    <div className="bg-[#f0f2f5] dark:bg-[#0d1517] text-[#0e181b] dark:text-white font-display min-h-screen antialiased">
      <div className="max-w-[440px] mx-auto min-h-screen flex flex-col relative">

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-[#f0f2f5]/90 dark:bg-[#0d1517]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
          <Link
            href={isBuyer ? '/dashboard/orders' : '/dashboard/seller/orders'}
            aria-label="Go back to orders"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-white/8 border border-black/8 dark:border-white/10 shadow-sm hover:bg-slate-100 dark:hover:bg-white/12 transition-colors"
          >
            <DynamicLucideIcon name="arrow_back_ios_new" className="text-base" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-none">Order Details</h1>
            <p className="text-[10px] text-slate-400 font-mono font-bold tracking-widest mt-0.5 uppercase">
              #{order.id.slice(0, 8)}
            </p>
          </div>
          {isBuyer && (
            <RefundButton orderId={order.id} orderStatus={orderStatus} refundStatus={order.refund_status} />
          )}
        </header>

        <main className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-32">

          {/* ── Payment Verification Banner ── */}
          {isBuyer && orderStatus === 'Pending' && (
            <Suspense fallback={null}>
              <OrderPaymentVerification orderId={order.id} currentStatus={order.status} />
            </Suspense>
          )}

          {/* ── Refund Status Banners ── */}
          {order.refund_status === 'Requested' && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl flex gap-3">
              <div className="size-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <DynamicLucideIcon name="history" className="text-amber-600 dark:text-amber-400 text-base" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-0.5">Refund Requested</h4>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 leading-relaxed">
                  {isBuyer
                    ? 'Your refund request is under review. An admin will respond shortly.'
                    : "The buyer has requested a refund. Funds are on hold pending admin review."}
                </p>
              </div>
            </div>
          )}

          {order.refund_status === 'Refunded' && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-2xl flex gap-3">
              <div className="size-8 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <DynamicLucideIcon name="keyboard_return" className="text-red-500 text-base" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-red-600 dark:text-red-400 mb-0.5">Order Refunded</h4>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 leading-relaxed">
                  This transaction was refunded. The amount has been returned to the buyer&apos;s wallet.
                </p>
              </div>
            </div>
          )}

          {order.refund_status === 'Rejected' && (
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl flex gap-3">
              <div className="size-8 rounded-xl bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                <DynamicLucideIcon name="cancel" className="text-slate-500 text-base" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300 mb-0.5">Refund Rejected</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  The refund request for this order was reviewed and rejected by an administrator.
                </p>
              </div>
            </div>
          )}

          {/* ── Hero Status Card ── */}
          <section
            className="relative rounded-3xl overflow-hidden p-6 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${currentStatus.color}18 0%, ${currentStatus.color}08 100%)`, border: `1px solid ${currentStatus.color}25` }}
          >
            {/* Watermark icon */}
            <DynamicLucideIcon
              name={currentStatus.icon}
              className="absolute -right-4 -top-4 text-[120px] opacity-[0.06]"
              style={{ color: currentStatus.color }}
            />

            <div className="flex items-start justify-between mb-5">
              <div
                className="size-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: `${currentStatus.color}20`, border: `1px solid ${currentStatus.color}30` }}
              >
                <DynamicLucideIcon name={currentStatus.icon} style={{ color: currentStatus.color }} className="text-2xl" />
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${currentStatus.color}18`, color: currentStatus.color, border: `1px solid ${currentStatus.color}30` }}
              >
                {currentStatus.label}
              </span>
            </div>

            <div className="mb-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {new Date(order.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* ── Progress Steps ── */}
            {!isCancelled && (
              <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  {STEPS.map((step, i) => {
                    const cfg = statusConfig[step];
                    const isDone = currentStep >= cfg.step;
                    const isActive = currentStep === cfg.step;
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
                        <div className="relative w-full flex items-center">
                          {i > 0 && (
                            <div
                              className="absolute right-1/2 w-full h-[2px] -translate-y-0"
                              style={{ backgroundColor: currentStep >= cfg.step ? currentStatus.color : undefined }}
                              // fallback grey via tailwind
                            >
                              <div className={`h-full ${currentStep >= cfg.step ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                                   style={currentStep >= cfg.step ? { backgroundColor: currentStatus.color } : {}} />
                            </div>
                          )}
                          <div
                            className={`relative z-10 mx-auto size-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isDone ? 'shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e292b]'}`}
                            style={isDone ? { backgroundColor: currentStatus.color, borderColor: currentStatus.color } : {}}
                          >
                            {isDone
                              ? <DynamicLucideIcon name="check" className="text-white text-xs font-black" />
                              : <span className="text-[8px] font-black text-slate-300 dark:text-slate-600">{i + 1}</span>
                            }
                          </div>
                        </div>
                        <span
                          className="text-[8px] font-bold text-center leading-tight uppercase tracking-wider text-slate-400 dark:text-slate-500"
                          style={{ color: isActive ? currentStatus.color : undefined }}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── Product Card ── */}
          <section className="bg-white dark:bg-[#1a2325] rounded-3xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm">
            <div className="flex gap-4 p-4">
              <div className="w-[88px] h-[88px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-black/5 dark:border-white/5 relative">
                {productImage ? (
                  <Image src={productImage} alt={order.product?.title || 'Product image'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <DynamicLucideIcon name="image" className="text-slate-300 text-3xl" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[9px] font-black text-[#1daddd] uppercase tracking-widest mb-1">{order.product?.category || 'Product'}</span>
                <h2 className="font-bold text-[15px] leading-snug mb-2 line-clamp-2">{order.product?.title || 'Item'}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                    Qty: {order.quantity}
                  </span>
                  {order.product?.condition && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full capitalize">
                      {order.product.condition}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {order.product?.id && (
              <Link
                href={`/marketplace/${order.product.id}`}
                className="flex items-center justify-between px-4 py-3 border-t border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
              >
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">View listing</span>
                <DynamicLucideIcon name="open_in_new" className="text-slate-400 text-sm" />
              </Link>
            )}
          </section>

          {/* ── Price Breakdown ── */}
          <section className="bg-white dark:bg-[#1a2325] rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Breakdown</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Item Price</span>
                <span className="text-sm font-bold">GHS {parseFloat(order.unit_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Platform Fee</span>
                <span className="text-sm font-bold text-slate-400">+ GHS {parseFloat(order.platform_fee_total).toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/5 my-4" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Total Paid</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  GHS <span style={{ color: '#1daddd' }}>{parseFloat(order.total_amount).toFixed(2)}</span>
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{ backgroundColor: '#1daddd12', borderColor: '#1daddd30' }}
              >
                <DynamicLucideIcon name={paymentMethod === 'Wallet' ? 'account_balance_wallet' : 'credit_card'} className="text-sm" style={{ color: '#1daddd' }} />
                <span className="text-[10px] font-black uppercase tracking-tight" style={{ color: '#1daddd' }}>{paymentMethod}</span>
              </div>
            </div>

            {isSeller && order.seller_payout_amount && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-500/8 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-0.5">Your Payout</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">GHS {parseFloat(order.seller_payout_amount).toFixed(2)}</p>
                </div>
                <div className="size-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                  <DynamicLucideIcon name="savings" className="text-emerald-500 text-xl" />
                </div>
              </div>
            )}
          </section>

          {/* ── Counterparty Card ── */}
          <section className="bg-white dark:bg-[#1a2325] rounded-3xl p-4 border border-black/5 dark:border-white/5 shadow-sm">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{counterpartyRole} Details</h2>
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-black/5 dark:border-white/5 relative">
                {counterparty?.avatar_url ? (
                  <Image
                    src={counterparty.avatar_url}
                    alt={`${counterparty?.display_name || counterpartyRole}'s profile photo`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: '#1daddd18' }}>
                    <DynamicLucideIcon name="person" style={{ color: '#1daddd' }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm truncate">{counterparty?.display_name || counterpartyRole}</h3>
                  {counterparty?.is_verified && (
                    <DynamicLucideIcon name="verified" className="text-[#1daddd] text-base shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate font-medium">{counterparty?.email || '—'}</p>
              </div>
              <Link
                href={`/profile/${counterparty?.id || ''}`}
                aria-label={`View ${counterparty?.display_name || counterpartyRole}'s profile`}
                className="size-9 rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
              >
                <DynamicLucideIcon name="chevron_right" className="text-slate-400 text-lg" />
              </Link>
            </div>
          </section>

          {/* ── Status History Timeline ── */}
          {statusHistory && statusHistory.length > 0 && (
            <section className="bg-white dark:bg-[#1a2325] rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Order Timeline</h2>
              <div className="space-y-1">
                {statusHistory.map((entry, i) => {
                  const cfg = statusConfig[entry.new_status] || { color: '#6B7280' };
                  const isLast = i === statusHistory.length - 1;
                  return (
                    <div key={entry.id} className="flex gap-3 relative">
                      {!isLast && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-slate-100 dark:bg-white/5" />
                      )}
                      <div
                        className="size-6 rounded-full border-2 border-white dark:border-[#1a2325] shrink-0 mt-1 relative z-10 flex items-center justify-center"
                        style={{ backgroundColor: cfg.color }}
                      >
                        <DynamicLucideIcon name={cfg.icon || 'circle'} className="text-white text-[8px]" />
                      </div>
                      <div className={`flex-1 ${!isLast ? 'pb-5' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold leading-tight" style={{ color: cfg.color }}>{entry.new_status}</p>
                          <p className="text-[10px] text-slate-400 font-mono shrink-0 mt-px">
                            {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {entry.changed_by_user?.display_name ? ` · by ${entry.changed_by_user.display_name}` : ''}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 bg-slate-50 dark:bg-white/3 rounded-xl px-3 py-2 italic leading-relaxed">
                            &ldquo;{entry.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Safety Note ── */}
          {(orderStatus === 'Paid' || orderStatus === 'Shipped') && (
            <div
              className="flex gap-3 p-4 rounded-2xl border"
              style={{ backgroundColor: '#1daddd0c', borderColor: '#1daddd25' }}
            >
              <DynamicLucideIcon name="shield" style={{ color: '#1daddd' }} className="shrink-0 text-xl" />
              <p className="text-xs leading-relaxed font-medium" style={{ color: '#3d8fa3' }}>
                <span className="font-black">Escrow Protected:</span> Your payment is held securely and released only after you confirm receipt. Never confirm delivery until you have physically received the item.
              </p>
            </div>
          )}

          {/* ── Confirm Delivery (Buyer) ── */}
          {isBuyer && (orderStatus === 'Paid' || orderStatus === 'Shipped') && (
            <section className="bg-white dark:bg-[#1a2325] rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="size-10 rounded-2xl bg-[#1daddd]/10 flex items-center justify-center shrink-0">
                  <DynamicLucideIcon name="inventory_2" className="text-[#1daddd] text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] leading-tight mb-0.5">Received Your Item?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Confirm delivery to release escrow funds to the seller. Only do this after inspecting the item.
                  </p>
                </div>
              </div>
              <ConfirmDeliveryButton orderId={order.id} orderStatus={orderStatus} />
            </section>
          )}

          {/* ── Mark as Shipped (Seller) ── */}
          {isSeller && orderStatus === 'Paid' && (
            <section className="bg-white dark:bg-[#1a2325] rounded-3xl p-5 border border-black/5 dark:border-white/5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="size-10 rounded-2xl bg-[#1daddd]/10 flex items-center justify-center shrink-0">
                  <DynamicLucideIcon name="local_shipping" className="text-[#1daddd] text-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px] leading-tight mb-0.5">Ready to Ship?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Once handed over, mark the item as shipped to notify the buyer and start the delivery confirmation process.
                  </p>
                </div>
              </div>
              <MarkAsShippedButton orderId={order.id} />
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
