'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SearchBar from '@/components/SearchBar';
import { formatPrice } from '@/utils/formatters';

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

export default function OrdersClient({ orders }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((order) => {
    const s = order.status?.toLowerCase();
    let matchesFilter = true;
    if (activeFilter === 'Active') matchesFilter = ['pending', 'paid', 'shipped', 'delivered'].includes(s);
    else if (activeFilter === 'Completed') matchesFilter = s === 'completed';
    else if (activeFilter === 'Cancelled') matchesFilter = s === 'cancelled' || s === 'refunded';

    if (!matchesFilter) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = order.product?.title?.toLowerCase().includes(query);
      const sellerMatch = (order.seller?.display_name || order.seller?.email)?.toLowerCase().includes(query);
      const statusMatch = order.status?.toLowerCase().includes(query);
      const amountMatch = order.total_amount?.toString().includes(query);
      const idMatch = order.id?.toLowerCase().includes(query);
      return titleMatch || sellerMatch || statusMatch || amountMatch || idMatch;
    }

    return true;
  });

  return (
    <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen">
      <div className="max-w-[440px] mx-auto min-h-screen flex flex-col">

        {/* ── Sticky Header with Home SearchBar ── */}
        <header className="sticky top-0 z-50 px-4 py-3 bg-white/95 dark:bg-[#242428]/95 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/30">
          <SearchBar
            placeholder="Search your orders..."
            showFilter={true}
            hideFilter={true}
            value={searchQuery}
            onChange={setSearchQuery}
            leftContent={
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`chip ${activeFilter === f ? 'chip-active' : 'chip-inactive'} whitespace-nowrap`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          />
        </header>

        {/* ── Order List ── */}
        <main className="flex-1 flex flex-col gap-3 px-4 pt-4 pb-32">
          {/* Active search filter feedback */}
          {searchQuery.trim() && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 mb-1">
              <span>
                Found <strong className="text-slate-800 dark:text-slate-200">{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'order' : 'orders'}
              </span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary font-bold hover:underline"
              >
                Clear
              </button>
            </div>
          )}

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
                        <p className="text-base font-black text-primary">
                          ₵{formatPrice(order.total_amount)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="size-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <DynamicLucideIcon name="person" className="text-primary text-[10px]" />
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
          ) : searchQuery.trim() ? (
            /* ── Empty Search State ── */
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
              <div className="size-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <DynamicLucideIcon name="search" className="text-4xl opacity-50" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                No matching orders
              </h2>
              <p className="text-sm text-slate-400 mb-6 text-center max-w-[240px]">
                No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} orders match &quot;{searchQuery}&quot;
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="h-11 flex items-center justify-center px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* ── Empty Filter State ── */
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
              <div
                className="size-24 rounded-3xl flex items-center justify-center mb-5 border bg-primary/10 border-primary/25"
              >
                <DynamicLucideIcon name="shopping_bag" className="text-4xl text-primary" />
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
                  className="h-12 flex items-center justify-center px-8 rounded-2xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary-dark transition-all active:scale-[0.98]"
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
