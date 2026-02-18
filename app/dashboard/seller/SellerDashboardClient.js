'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ManualActivationButton from './ManualActivationButton';

export default function SellerDashboardClient({
    user,
    profile,
    listings,
    isSubscribed,
    subscription,
    pendingSubscriptions,
    totalEarnings,
    itemsSold,
    activeListings,
    daysUntilExpiry,
    activePromotions,
    chartData = [],
    dayLabels = []
}) {
    const router = useRouter();
    console.log('[SellerDashboardClient] Rendered');

    const [hiddenSubs, setHiddenSubs] = useState([]);
    const visiblePendingSubs = pendingSubscriptions?.filter(sub => !hiddenSubs.includes(sub.id)) || [];

    const displayName = profile?.display_name || user.email.split('@')[0];

    // Greeting based on time of day
    const [greeting, setGreeting] = useState('Good Morning');
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
        else if (hour >= 17) setGreeting('Good Evening');
    }, []);

    return (
        <div className="bg-[#f6f7f8] dark:bg-[#131d1f] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f8] dark:bg-[#131d1f] shadow-2xl overflow-hidden">

                {/* Main Content Area */}
                <main className="flex-1 w-full flex flex-col px-4 py-8 pb-32 space-y-8 overflow-y-auto no-scrollbar">

                    {/* Greeting & Header */}
                    <div className="px-1 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{greeting}</h3>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{displayName}</h2>
                        </div>
                        <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${profile?.is_verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-400/10 text-slate-400'}`}>
                            <span className="material-symbols-outlined text-2xl fill-1">
                                {profile?.is_verified ? 'verified' : 'new_releases'}
                            </span>
                        </div>
                    </div>

                    {/* Summary Stats Row */}
                    <section>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white dark:bg-[#1e292b] p-4 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1.5 text-center border border-transparent dark:border-white/5 group hover:shadow-md transition-all">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{activeListings}</span>
                            </div>
                            <div className="bg-white dark:bg-[#1e292b] p-4 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1.5 text-center border border-transparent dark:border-white/5 group hover:shadow-md transition-all">
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sold</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{itemsSold}</span>
                            </div>
                            <div className="bg-white dark:bg-[#1e292b] p-4 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1.5 text-center border border-transparent dark:border-white/5 relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 right-0 size-8 bg-primary/10 rounded-bl-2xl -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Revenue</span>
                                <span className="text-xl font-black text-primary tracking-tight">₵{totalEarnings.toFixed(0)}</span>
                            </div>
                        </div>
                    </section>

                    {/* Primary CTA */}
                    <section>
                        {isSubscribed ? (
                            <Link href="/dashboard/seller/create" className="h-14 flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98] group gap-2">
                                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">add</span>
                                <span>Create Listing</span>
                            </Link>
                        ) : (
                            <Link href="/subscriptions" className="h-14 flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98] group gap-2">
                                <span className="material-symbols-outlined text-xl">loyalty</span>
                                <span>Subscribe to Sell</span>
                            </Link>
                        )}
                    </section>

                    {/* Quick Stats Chart */}
                    <section>
                        <div className="bg-white dark:bg-[#1e292b] rounded-3xl p-6 shadow-soft border border-transparent dark:border-white/5">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Quick Overview</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white">{activeListings}</span>
                                        <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-lg font-bold flex items-center ring-1 ring-primary/20">
                                            <span className="material-symbols-outlined text-[14px] mr-0.5 font-bold">inventory</span>
                                            Active
                                        </span>
                                    </div>
                                </div>
                                <Link href="/dashboard/seller/analytics" className="h-9 px-3 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Details</span>
                                    <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                                </Link>
                            </div>

                            <div className="h-28 w-full relative">
                                {chartData.length > 0 ? (
                                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 350 100">
                                        <defs>
                                            <linearGradient id="chartLineGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#1daddd" stopOpacity="0.2"></stop>
                                                <stop offset="100%" stopColor="#1daddd" stopOpacity="0"></stop>
                                            </linearGradient>
                                        </defs>

                                        {(() => {
                                            const max = Math.max(...chartData, 10); // Minimum max for scaling
                                            const points = chartData.map((val, i) => ({
                                                x: (i * (350 / 6)),
                                                y: 100 - ((val / max) * 80 + 10) // Scale to 10-90 range
                                            }));

                                            const d = points.reduce((acc, p, i) =>
                                                i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "");

                                            const areaD = `${d} V 100 H 0 Z`;

                                            return (
                                                <>
                                                    <path d={d} fill="none" stroke="#1daddd" strokeLinecap="round" strokeWidth="3.5" vectorEffect="non-scaling-stroke"></path>
                                                    <path d={areaD} fill="url(#chartLineGradient)" stroke="none"></path>
                                                    {points.map((p, i) => (
                                                        <circle
                                                            key={i}
                                                            className="fill-white dark:fill-[#1e292b] stroke-primary stroke-[3px]"
                                                            cx={p.x}
                                                            cy={p.y}
                                                            r="3.5"
                                                        />
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                                        <span className="text-xs font-bold uppercase tracking-widest">No data available</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between mt-5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                {dayLabels.map((day, idx) => (
                                    <span key={idx}>{day}</span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Subscriptions Status / Alerts */}
                    {(visiblePendingSubs.length > 0 || !isSubscribed || daysUntilExpiry <= 7) && (
                        <section className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-widest leading-none">Important Alerts</h3>

                            {visiblePendingSubs.map(sub => (
                                <div key={sub.id} className="bg-amber-500/10 dark:bg-amber-500/5 ring-1 ring-amber-500/20 p-5 rounded-2xl shadow-sm space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-amber-500 text-2xl fill-1">pending_actions</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-amber-900 dark:text-amber-500 uppercase tracking-tight">Payment Processing</p>
                                            <p className="text-[10px] font-bold text-amber-700/60 dark:text-amber-500/50 truncate">Ref: {sub.payment_reference}</p>
                                        </div>
                                    </div>
                                    <ManualActivationButton
                                        subscriptionId={sub.id}
                                        paymentReference={sub.payment_reference}
                                        onFailure={() => setHiddenSubs(prev => [...prev, sub.id])}
                                    />
                                </div>
                            ))}

                            {!isSubscribed && pendingSubscriptions?.length === 0 && (
                                <div className="bg-red-500/10 dark:bg-red-500/5 ring-1 ring-red-500/20 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-red-500 text-2xl fill-1">error</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-red-500 uppercase tracking-tight">Plan Expired</p>
                                            <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest mt-0.5">Seller tools locked</p>
                                        </div>
                                    </div>
                                    <Link href="/subscriptions" className="h-9 px-4 flex items-center bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl active:scale-95 transition-all">Renew</Link>
                                </div>
                            )}

                            {isSubscribed && daysUntilExpiry <= 7 && (
                                <div className="bg-primary/10 dark:bg-primary/5 ring-1 ring-primary/20 p-5 rounded-2xl flex items-center gap-3 shadow-sm">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary text-2xl fill-1">info</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-primary uppercase tracking-tight">Expiring Soon</p>
                                        <p className="text-[11px] font-bold text-primary/60 uppercase tracking-widest mt-0.5">Ends in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Promotions Shortcut */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1 uppercase tracking-widest leading-none">Marketplace Performance</h3>
                        <Link href="/dashboard/seller/promotions" className="bg-gradient-to-br from-primary to-[#0e95c1] dark:from-primary/20 dark:to-primary/10 p-5 rounded-2xl shadow-lg shadow-primary/10 border border-white/10 flex items-center justify-between group active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center pointer-events-none">
                                    <span className="material-symbols-outlined text-white text-2xl animate-pulse">rocket_launch</span>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-tight">Promoted Items</p>
                                    <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
                                        {activePromotions} Active Campaigns
                                    </p>
                                </div>
                            </div>
                            <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </div>
                        </Link>
                    </section>

                    {/* Recent Listings */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recent Listings</h3>
                            <Link href="/dashboard/seller/listings" className="text-primary text-[11px] font-bold uppercase tracking-widest hover:text-primary-dark transition-colors">Manage All</Link>
                        </div>

                        <div className="space-y-3">
                            {listings?.slice(0, 4).map(item => (
                                <div key={item.id} className="bg-white dark:bg-[#1e292b] rounded-2xl p-3 shadow-soft border border-transparent dark:border-white/5 flex items-center gap-4 group active:scale-[0.98] transition-all cursor-pointer">
                                    <div className="size-16 rounded-xl bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden relative border border-transparent dark:border-white/5">
                                        {item.image_url ? (
                                            <Image src={item.image_url} alt={item.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                <span className="material-symbols-outlined text-2xl">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-sm mb-1">{item.title}</h4>
                                        <p className="text-[13px] font-black text-primary">₵{parseFloat(item.price || 0).toFixed(0)}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <div className={`size-1.5 rounded-full ${item.status === 'Active' ? 'bg-emerald-500' : item.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.status || 'Active'}</span>
                                        </div>
                                    </div>
                                    <div className="size-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </div>
                                </div>
                            ))}

                            {(!listings || listings.length === 0) && (
                                <div className="text-center py-16 bg-white dark:bg-[#1e292b] rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5 shadow-soft">
                                    <div className="size-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl text-slate-200 dark:text-slate-700">inventory_2</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">No listings yet</p>
                                    <Link href="/dashboard/seller/create" className="text-primary text-[11px] font-bold uppercase tracking-widest mt-2 inline-block hover:underline">Start Selling</Link>
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
