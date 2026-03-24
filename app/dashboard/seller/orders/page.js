'use client';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function SellerOrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            *,
            product:products(id, title, images, image_url),
            buyer:profiles!orders_buyer_id_profiles_fkey(display_name, email)
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setOrders(data || []);
      } catch (err) {
        console.error('Error loading orders:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [supabase, router]);

  const statusColors = {
    Pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Paid: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Shipped: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    Delivered: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Completed: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    Cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const escrowColors = {
    Held: 'text-amber-500',
    Released: 'text-emerald-500',
    Refunded: 'text-red-500',
  };

  return (
    <div className="bg-[#f6f7f8] dark:bg-[#131d1f] min-h-screen font-display antialiased">
      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden pb-24">
        {/* Header */}
        <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#f6f7f8]/90 dark:bg-[#131d1f]/90 backdrop-blur-md z-10 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">My Sales</h1>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Track your orders</p>
          </div>
          <Link href="/dashboard/seller" className="size-10 rounded-xl bg-white dark:bg-white/5 shadow-soft border border-transparent dark:border-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">grid_view</span>
          </Link>
        </header>

        <main className="flex-1 px-4 py-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
              Error loading orders: {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse space-y-4">
              <div className="size-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white dark:bg-[#1e292b] p-10 rounded-3xl shadow-soft border border-transparent dark:border-white/5 text-center space-y-6">
              <div className="size-20 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">shopping_cart_off</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No orders yet</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Your sales will appear here once someone buys your items.</p>
              </div>
              <Link href="/dashboard/seller/create" className="h-12 w-full flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-primary/20">
                Create a Listing
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="bg-white dark:bg-[#1e292b] p-4 rounded-3xl shadow-soft border border-transparent dark:border-white/5 flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.98] group"
                >
                  <div className="size-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shrink-0">
                    <Image
                      src={order.product?.images?.[0] || order.product?.image_url || '/placeholder.png'}
                      alt={order.product?.title || 'Product'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {order.product?.title || 'Unknown Product'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                      Buyer: {order.buyer?.display_name || order.buyer?.email?.split('@')[0] || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${statusColors[order.status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {order.status}
                        </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-sm font-black text-primary uppercase tracking-tight">
                        ₵{parseFloat(order.seller_payout_amount || order.total_amount).toFixed(2)}
                    </p>
                    {order.escrow_status && (
                        <p className={`text-[8px] font-bold uppercase tracking-widest ${escrowColors[order.escrow_status] || 'text-slate-400'}`}>
                            Escrow: {order.escrow_status}
                        </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
