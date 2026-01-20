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

    return (
        <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-start overflow-x-hidden text-slate-900 font-display">
            <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative pb-24 shadow-xl">
                {/* Hero Image Section */}
                <div className="relative w-full h-80 group">
                    <div className="absolute inset-0 bg-gray-100">
                        {product?.image_url ? (
                            <Image
                                src={product.image_url}
                                alt={product.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <span className="material-symbols-outlined text-6xl text-gray-300">image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-90"></div>
                    </div>

                    {/* Header Overlay */}
                    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 pt-4">
                        <button
                            onClick={() => router.back()}
                            className="bg-black/20 backdrop-blur-md text-white rounded-full p-2 hover:bg-black/40 transition border border-white/10 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <button className="bg-black/20 backdrop-blur-md text-white rounded-full p-2 hover:bg-black/40 transition border border-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">more_vert</span>
                        </button>
                    </div>

                    <Link
                        href={`/dashboard/seller/listings/edit/${product.id}`}
                        className="absolute bottom-4 right-4 bg-white text-[#0bb8da] rounded-full p-3 shadow-lg hover:scale-105 transition active:scale-95 flex items-center justify-center z-20 border border-gray-100"
                    >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                    </Link>
                </div>

                {/* Title and Price */}
                <div className="px-5 -mt-6 relative z-10 mb-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                            {product?.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[#0bb8da] text-2xl font-bold tracking-tight">₵{parseFloat(product?.price || 0).toFixed(2)}</span>
                            {product?.original_price && (
                                <>
                                    <span className="text-gray-400 text-sm line-through font-medium">₵{parseFloat(product.original_price).toFixed(2)}</span>
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded ml-2">
                                        {Math.round((1 - (product.price / product.original_price)) * 100)}% OFF
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-6">
                    {/* Performance Metrics */}
                    <section aria-label="Performance Metrics">
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-gray-500 text-xs font-bold uppercase tracking-widest">Performance (7 Days)</h2>
                                <span className="material-symbols-outlined text-gray-400 text-[18px]">bar_chart</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 divide-x divide-gray-100">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1.5 text-[#0bb8da] mb-1">
                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                    </div>
                                    <span className="text-2xl font-extrabold text-slate-900">{product?.views || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium">Views</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1.5 text-pink-500 mb-1">
                                        <span className="material-symbols-outlined text-[18px] icon-filled">favorite</span>
                                    </div>
                                    <span className="text-2xl font-extrabold text-slate-900">{product?.likes || 0}</span>
                                    <span className="text-xs text-gray-500 font-medium">Saves</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1.5 text-blue-500 mb-1">
                                        <span className="material-symbols-outlined text-[18px]">share</span>
                                    </div>
                                    <span className="text-2xl font-extrabold text-slate-900">0</span>
                                    <span className="text-xs text-gray-500 font-medium">Shares</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Listing Status Toggle */}
                    <section aria-label="Listing Status">
                        <div className="bg-white border border-gray-200 rounded-2xl p-1 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSold ? 'bg-gray-400' : 'bg-green-500'}`}></div>
                            <div className="flex flex-col pl-4 py-3">
                                <span className="text-xs text-gray-500 font-medium mb-0.5">Current Status</span>
                                <div className="flex items-center gap-2">
                                    {!isSold ? (
                                        <>
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                            </span>
                                            <span className="text-slate-900 font-bold tracking-wide">Active Listing</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400"></span>
                                            <span className="text-slate-900 font-bold tracking-wide opacity-60">Sold</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="pr-4 py-2 flex items-center gap-3 border-l border-gray-100 pl-4">
                                <span className="text-xs text-gray-500 font-medium text-right leading-tight">Mark<br />Sold</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isSold}
                                        onChange={handleToggleSold}
                                        disabled={loading}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:bg-[#0bb8da]"></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Activity Log */}
                    <section aria-label="Activity Log">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-slate-900 text-lg font-bold">Activity Log</h2>
                            <button className="text-[#0bb8da] text-xs font-bold hover:underline">View All</button>
                        </div>
                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-3 border border-gray-200">
                                <div className="bg-white border border-gray-100 p-2 rounded-full text-[#0bb8da] shrink-0 shadow-sm flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-700">Listing created</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {new Date(product?.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="fixed bottom-0 left-0 right-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] bg-white/90 backdrop-blur-xl border-t border-gray-200 flex items-center gap-3 z-[100] w-full max-w-md mx-auto">
                    <Link
                        href={`/dashboard/seller/listings/edit/${product.id}`}
                        className="flex-1 bg-white hover:bg-gray-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl border border-gray-200 shadow-sm transition flex items-center justify-center gap-2 group"
                    >
                        <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-slate-600 transition">edit_square</span>
                        Edit Details
                    </Link>
                    <Link
                        href={`/dashboard/seller/listings/promote/${product.id}`}
                        className="flex-[1.5] bg-[#0bb8da] hover:bg-[#0bb8da]/90 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-[0_4px_15px_rgba(11,184,218,0.4)] transition flex items-center justify-center gap-2 text-center"
                    >
                        <span className="material-symbols-outlined text-[20px] icon-filled">rocket_launch</span>
                        Promote Listing
                    </Link>
                </div>
            </div>
        </div>
    );
}
