'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const STATUS_CONFIG = {
  'pending':   { label: 'Pending',   color: '#F59E0B', bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-500/20'  },
  'paid':      { label: 'Paid',      color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  'shipped':   { label: 'Shipped',   color: '#3B82F6', bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',      border: 'border-blue-500/20'   },
  'delivered': { label: 'Delivered', color: '#8B5CF6', bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',  border: 'border-violet-500/20' },
  'completed': { label: 'Completed', color: '#10B981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  'cancelled': { label: 'Cancelled', color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',        border: 'border-red-500/20'    },
  'refunded':  { label: 'Refunded',  color: '#EF4444', bg: 'bg-red-500/10',     text: 'text-red-600 dark:text-red-400',        border: 'border-red-500/20'    },
};

const FILTERS = ['All', 'Active', 'Completed', 'Cancelled'];

const fmt = (val) =>
  parseFloat(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrdersClient({ orders }) {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredOrders = orders.filter((order) => {
    const s = order.status?.toLowerCase();
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Active') return ['pending', 'paid', 'shipped', 'delivered'].includes(s);
    if (activeFilter === 'Completed') return s === 'completed';
    if (activeFilter === 'Cancelled') return s === 'cancelled' || s === 'refunded';
    return true;
  });

  const activeCount = orders.filter((o) =>
    ['pending', 'paid', 'shipped', 'delivered'].includes(o.status?.toLowerCase())
  ).length;

  return (
    <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen">
      <div className="max-w-[440px] mx-auto min-h-screen flex flex-col">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 px-4 pt-4 pb-3 bg-white/90 dark:bg-[#242428]/90 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Orders</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
                {activeCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[#1daddd] font-bold">
                    · {activeCount} active
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/marketplace"
              aria-label="Browse marketplace"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1daddd]/10 border border-[#1daddd]/20 text-[#1daddd] text-xs font-bold hover:bg-[#1daddd]/20 transition-colors"
            >
              <DynamicLucideIcon name="shopping_bag" className="text-sm" />
              Shop
            </Link>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  activeFilter === f
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-black/5 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </header>

        {/* ── Order List ── */}
        <main className="flex-1 flex flex-col gap-3 px-4 pt-4 pb-32">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const productImage = order.product?.images?.[0] || order.product?.image_url;
              const sellerName = order.seller?.display_name || order.seller?.email?.split('@')[0] || 'Unknown';
              const rawStatus = order.status?.toLowerCase() || 'pending';
              const status = STATUS_CONFIG[rawStatus] || STATUS_CONFIG['pending'];
              const date = new Date(order.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              const isActive = ['pending', 'paid', 'shipped', 'delivered'].includes(rawStatus);

              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="group bg-white dark:bg-[#1a2325] rounded-3xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md hover:border-black/10 dark:hover:border-white/10 transition-all duration-200 overflow-hidden active:scale-[0.99]"
                >
                  <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    <div className="size-20 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative border border-black/5 dark:border-white/5">
                      {productImage ? (
                        <Image
                          src={productImage}
                          alt={order.product?.title || 'Product'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <DynamicLucideIcon name="image" className="text-slate-300 text-2xl" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 flex-1">
                            {order.product?.title || 'Item'}
                          </h3>
                          {/* Status Badge */}
                          <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${status.bg} ${status.text} ${status.border}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-base font-black" style={{ color: '#1daddd' }}>
                          GHS {fmt(order.total_amount)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="size-4 rounded-full bg-[#1daddd]/10 flex items-center justify-center shrink-0">
                            <DynamicLucideIcon name="person" className="text-[#1daddd] text-[10px]" />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[90px]">{sellerName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <DynamicLucideIcon name="calendar_today" className="text-[11px]" />
                          <span>{date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active progress bar accent */}
                  {isActive && (
                    <div className="h-0.5 w-full" style={{ backgroundColor: status.color, opacity: 0.4 }} />
                  )}
                </Link>
              );
            })
          ) : (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
              <div
                className="size-24 rounded-3xl flex items-center justify-center mb-5 border"
                style={{ backgroundColor: '#1daddd10', borderColor: '#1daddd25' }}
              >
                <DynamicLucideIcon name="shopping_bag" className="text-4xl" style={{ color: '#1daddd' }} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {activeFilter === 'All' ? 'No orders yet' : `No ${activeFilter} orders`}
              </h2>
              <p className="text-sm text-slate-400 mb-8 max-w-[220px] leading-relaxed">
                {activeFilter === 'All'
                  ? "You haven't purchased anything yet. Explore the marketplace to get started."
                  : `You have no ${activeFilter.toLowerCase()} orders at the moment.`}
              </p>
              {activeFilter === 'All' ? (
                <Link
                  href="/marketplace"
                  className="h-12 flex items-center justify-center px-8 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] hover:opacity-90"
                  style={{ backgroundColor: '#1daddd', boxShadow: '0 8px 24px #1daddd30' }}
                >
                  Browse Marketplace
                </Link>
              ) : (
                <button
                  onClick={() => setActiveFilter('All')}
                  className="h-12 flex items-center justify-center px-8 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-bold text-sm transition-all active:scale-[0.98] hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  View All Orders
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
