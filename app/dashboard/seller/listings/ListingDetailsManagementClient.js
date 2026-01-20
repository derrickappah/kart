'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function ListingDetailsManagementClient({ product }) {
    const router = useRouter();
    const supabase = createClient();
    const [isSold, setIsSold] = useState(product?.status === 'Sold' || product?.status === 'Completed');
    const [loading, setLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleToggleSold = async () => {
        const newStatus = !isSold ? 'Sold' : 'Active';
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({ status: newStatus })
                .eq('id', product.id);

            if (error) throw error;
            setIsSold(!isSold);
            router.refresh();
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', product.id);

            if (error) throw error;
            router.push('/dashboard/seller/listings');
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete listing. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-[#1e292b] shadow-2xl overflow-hidden">

                {/* Hero Image Section */}
                <div className="relative w-full h-[400px] shrink-0">
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800">
                        {product?.image_url ? (
                            <Image
                                src={product.image_url}
                                alt={product.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">image</span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white dark:from-[#1e292b] to-transparent"></div>
                    </div>

                    {/* Header Overlay */}
                    <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                        <button
                            onClick={() => router.back()}
                            className="bg-black/20 backdrop-blur-md text-white rounded-2xl p-2.5 hover:bg-black/40 transition-all border border-white/10 active:scale-95 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="bg-black/20 backdrop-blur-md text-white rounded-2xl p-2.5 hover:bg-black/40 transition-all border border-white/10 active:scale-95 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-2xl">more_vert</span>
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setShowMenu(false)}
                                    ></div>
                                    <div className="absolute right-0 mt-3 w-52 bg-white dark:bg-[#1e292b] rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 py-2 z-40 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
                                        <Link
                                            href={`/product/${product.id}`}
                                            className="w-full px-5 py-4 flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">View on Site</span>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setShowMenu(false);
                                                handleDelete();
                                            }}
                                            disabled={isDeleting}
                                            className="w-full px-5 py-4 flex items-center gap-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-colors text-left"
                                        >
                                            <div className="size-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                                <span className="material-symbols-outlined text-[20px]">
                                                    {isDeleting ? 'progress_activity' : 'delete'}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-widest">{isDeleting ? 'Deleting...' : 'Delete Listing'}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <Link
                        href={`/dashboard/seller/listings/edit/${product.id}`}
                        className="absolute bottom-8 right-6 bg-primary text-white rounded-2xl p-3.5 shadow-xl shadow-primary/20 hover:scale-105 transition-all active:scale-95 flex items-center justify-center z-20"
                    >
                        <span className="material-symbols-outlined text-[20px] fill-1">edit</span>
                    </Link>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 px-6 -mt-6 relative z-10 space-y-8 pb-40 overflow-y-auto no-scrollbar">
                    {/* Title and Price */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                            {product?.title}
                        </h1>
                        <div className="flex items-center gap-3">
                            <span className="text-primary text-2xl font-black tracking-tight">₵{parseFloat(product?.price || 0).toFixed(0)}</span>
                            {product?.original_price && (
                                <>
                                    <span className="text-slate-400 dark:text-slate-500 text-sm line-through font-bold">₵{parseFloat(product.original_price).toFixed(0)}</span>
                                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ring-1 ring-emerald-500/20">
                                        {Math.round((1 - (product.price / product.original_price)) * 100)}% OFF
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <section>
                        <div className="bg-[#f6f7f8] dark:bg-white/5 rounded-[2.5rem] p-6 border border-transparent dark:border-white/5">
                            <div className="flex items-center justify-between mb-6 px-1">
                                <h2 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Performance (7 Days)</h2>
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">analytics</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#1e292b] shadow-soft active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-1.5 text-primary">
                                        <span className="material-symbols-outlined text-[20px] fill-1">visibility</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{product?.views_count || 0}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Views</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#1e292b] shadow-soft active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-1.5 text-rose-500">
                                        <span className="material-symbols-outlined text-[20px] fill-1">favorite</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{product?.likes_count || 0}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Saves</span>
                                </div>
                                <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#1e292b] shadow-soft active:scale-[0.98] transition-all">
                                    <div className="flex items-center gap-1.5 text-indigo-500">
                                        <span className="material-symbols-outlined text-[20px] fill-1">shortcut</span>
                                    </div>
                                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{product?.shares_count || 0}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Shares</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Listing Status Toggle */}
                    <section>
                        <div className="bg-[#f6f7f8] dark:bg-white/5 rounded-[2rem] p-6 border border-transparent dark:border-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Listing Status</span>
                                    <div className="flex items-center gap-2">
                                        {!isSold ? (
                                            <>
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                </span>
                                                <span className="text-slate-900 dark:text-white font-black text-sm uppercase tracking-tight">Active</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                                                <span className="text-slate-400 dark:text-slate-500 font-black text-sm uppercase tracking-tight">Marked as Sold</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleSold}
                                    disabled={loading}
                                    className={`h-11 px-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-[0.98] flex items-center gap-2 ${isSold
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-white dark:bg-[#1e292b] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-soft hover:bg-slate-50 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {loading ? (
                                        <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[18px] fill-1">
                                                {isSold ? 'check_circle' : 'sell'}
                                            </span>
                                            <span>{isSold ? 'Mark Active' : 'Mark Sold'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Activity Log */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-widest">Activity Log</h2>
                            <button className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-[#f6f7f8] dark:bg-white/5 rounded-2xl p-4 flex items-center gap-4 border border-transparent dark:border-white/5 active:scale-[0.99] transition-all">
                                <div className="bg-white dark:bg-[#1e292b] p-2.5 rounded-xl text-primary shadow-soft flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[20px] fill-1">add_circle</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Listing created</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">
                                        {new Date(product?.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-[#1e292b]/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/5 flex items-center gap-4 z-[100] w-full max-w-md mx-auto">
                    <Link
                        href={`/dashboard/seller/listings/edit/${product.id}`}
                        className="flex-1 h-14 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-black text-[13px] uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-white/10 shadow-soft transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-primary transition-all">edit_note</span>
                        Edit
                    </Link>
                    <Link
                        href={`/dashboard/seller/listings/promote/${product.id}`}
                        className="flex-[1.5] h-14 bg-primary hover:bg-primary-dark text-white font-black text-[13px] uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="material-symbols-outlined text-[20px] fill-1">rocket_launch</span>
                        Promote
                    </Link>
                </div>
            </div>
        </div>
    );
}
