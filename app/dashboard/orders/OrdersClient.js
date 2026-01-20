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
    <div className="bg-[#fafaf9] dark:bg-[#1d1e20] font-display antialiased min-h-screen transition-colors duration-200">
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#fafaf9] dark:bg-[#1d1e20] shadow-2xl overflow-hidden">


        {/* Main Content List */}
        <main className="flex-1 flex flex-col gap-5 p-4 pb-20 overflow-y-auto">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const productImage = order.product?.image_url || order.product?.images?.[0];
              const sellerName = order.seller?.display_name || order.seller?.email?.split('@')[0] || 'Unknown';
              const sellerInitials = sellerName.substring(0, 2).toUpperCase();

              return (
                <div
                  key={order.id}
                  className="group relative flex flex-col rounded-xl bg-white dark:bg-[#2a2c2f] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-lg transition-shadow border border-transparent dark:border-gray-800"
                >
                  <Link href={`/dashboard/orders/${order.id}`} className="flex items-start gap-4">
                    {/* Image */}
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {productImage ? (
                        <Image
                          src={productImage}
                          alt={order.product?.title || 'Product'}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="material-symbols-outlined text-3xl">image</span>
                        </div>
                      )}
                      {order.status === 'Delivered' || order.status === 'Completed' ? (
                        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                          {order.status}
                        </div>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between h-24 py-0.5">
                      <div>
                        <h3 className="text-[#0f171a] dark:text-white text-base font-bold leading-tight line-clamp-2 pr-2">
                          {order.product?.title}
                        </h3>
                        <p className="mt-1 text-[#176782] font-bold text-sm">₵{parseFloat(order.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-[#538393]">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        <span>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </Link>

                  {/* Divider */}
                  <div className="my-4 h-px w-full bg-gray-100 dark:bg-gray-700"></div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                        {sellerInitials}
                      </div>
                      <span className="text-[11px] text-[#538393] font-medium truncate max-w-[100px]">
                        Seller: {sellerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {(order.status === 'Completed' || order.status === 'Delivered') && (
                        <button className="flex items-center justify-center gap-2 rounded-lg bg-[#176782] px-4 py-2 text-white shadow-sm shadow-[#176782]/30 transition-all hover:bg-[#176782]/90 active:scale-95 text-xs font-semibold">
                          <span className="material-symbols-outlined text-[16px]">star</span>
                          <span>Rate Seller</span>
                        </button>
                      )}
                      {order.status === 'Completed' && (
                        <button className="flex items-center justify-center gap-2 rounded-lg border border-[#176782] text-[#176782] px-3 py-2 text-xs font-semibold transition-all hover:bg-[#176782]/5 active:scale-95">
                          <span className="material-symbols-outlined text-[16px] filled">refresh</span>
                          <span>Buy Again</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[#538393]">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">shopping_cart</span>
              <p className="font-bold">No items found</p>
              <Link href="/marketplace" className="text-[#176782] text-sm mt-2 underline font-semibold">
                Start Shopping
              </Link>
            </div>
          )}
          <div className="h-8"></div>
        </main>
      </div>
    </div>
  );
}
