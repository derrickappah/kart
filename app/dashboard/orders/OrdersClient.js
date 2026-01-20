'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function OrdersClient({ orders }) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'To Rate', 'Recurring', 'Archived'];

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'To Rate') return order.status === 'Completed' || order.status === 'Delivered';
    // Add logic for Recurring/Archived if fields exist in database
    return true;
  });

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-4 pb-32 overflow-y-auto no-scrollbar">
          {/* Section Title */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 ml-2 mt-4">Purchased Items</h3>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`chip ${activeFilter === filter ? 'chip-active' : 'chip-inactive'} whitespace-nowrap`}
              >
                {filter}
              </button>
            ))}
          </div>

          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const productImage = order.product?.image_url || order.product?.images?.[0];
                const sellerName = order.seller?.display_name || order.seller?.email?.split('@')[0] || 'Unknown';
                const sellerInitials = sellerName.substring(0, 2).toUpperCase();

                return (
                  <div
                    key={order.id}
                    className="group relative flex flex-col rounded-2xl bg-white dark:bg-[#1e292b] p-4 shadow-soft border border-transparent dark:border-white/5 transition-all duration-300"
                  >
                    <Link href={`/dashboard/orders/${order.id}`} className="flex items-start gap-4">
                      {/* Image */}
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800">
                        {productImage ? (
                          <Image
                            src={productImage}
                            alt={order.product?.title || 'Product'}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <span className="material-symbols-outlined text-3xl">image</span>
                          </div>
                        )}
                        {/* Status Overlay */}
                        {(order.status === 'Delivered' || order.status === 'Completed') && (
                          <div className="absolute top-1.5 left-1.5 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm shadow-sm ring-1 ring-white/20 uppercase tracking-tighter">
                            {order.status}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                        <div className="space-y-1">
                          <h3 className="text-slate-900 dark:text-white text-[15px] font-bold leading-tight line-clamp-2">
                            {order.product?.title}
                          </h3>
                          <p className="text-primary font-bold text-base leading-none">₵{parseFloat(order.total_amount).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          <span>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </Link>

                    {/* Divider */}
                    <div className="my-4 h-px w-full bg-slate-50 dark:bg-white/5"></div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold ring-1 ring-primary/20">
                          {sellerInitials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Seller</span>
                          <span className="text-[12px] text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[120px]">
                            {sellerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === 'Completed' && (
                          <button
                            onClick={() => router.push(`/product/${order.product?.id}`)}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 px-3 py-2 text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-50 dark:hover:bg-white/5 active:scale-[0.98] text-xs font-bold"
                          >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            <span>Buy Again</span>
                          </button>
                        )}
                        {(order.status === 'Completed' || order.status === 'Delivered') && (
                          <button
                            onClick={() => router.push(`/dashboard/orders/${order.id}/review`)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark active:scale-[0.98] text-xs font-bold"
                          >
                            <span className="material-symbols-outlined text-[16px]">star</span>
                            <span>Rate Seller</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
              <div className="size-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl opacity-50">shopping_cart</span>
              </div>
              <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">No items found</p>
              <p className="text-sm mb-6">You haven't purchased anything yet.</p>
              <Link href="/marketplace" className="h-12 flex items-center justify-center px-8 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98]">
                Start Shopping
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
