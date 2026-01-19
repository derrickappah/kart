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
    daysUntilExpiry
}) {
    const router = useRouter();
    const displayName = profile?.display_name || user.email.split('@')[0];
    
    // Greeting based on time of day
    const [greeting, setGreeting] = useState('Good Morning');
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
        else if (hour >= 17) setGreeting('Good Evening');
    }, []);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-text-primary-light dark:text-text-primary-dark min-h-screen flex flex-col antialiased selection:bg-primary/30">
            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-md mx-auto pb-24 px-4 pt-6">
                {/* Summary Stats Row */}
                <section className="mb-6">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-surface-dark p-3 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1 text-center border border-gray-100 dark:border-gray-800">
                            <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white">{activeListings}</span>
                        </div>
                        <div className="bg-white dark:bg-surface-dark p-3 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1 text-center border border-gray-100 dark:border-gray-800">
                            <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sold</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white">{itemsSold}</span>
                        </div>
                        <div className="bg-white dark:bg-surface-dark p-3 rounded-2xl shadow-soft flex flex-col items-center justify-center gap-1 text-center border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 size-8 bg-primary/10 rounded-bl-2xl -mr-2 -mt-2"></div>
                            <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Earnings</span>
                            <span className="text-xl font-black text-primary uppercase tracking-tight">₵{totalEarnings.toFixed(0)}</span>
                        </div>
                    </div>
                </section>

                {/* Primary CTA */}
                <section className="mb-8">
                    {isSubscribed ? (
                        <Link href="/dashboard/seller/create" className="btn-primary w-full h-14 shadow-xl shadow-primary/20 text-base">
                            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
                            <span className="uppercase tracking-widest font-black">Create Listing</span>
                        </Link>
                    ) : (
                        <Link href="/sell#plans" className="btn-primary w-full h-14 shadow-xl shadow-primary/20 text-base">
                            <span className="material-symbols-outlined">subscriptions</span>
                            <span className="uppercase tracking-widest font-black">Subscribe to Sell</span>
                        </Link>
                    )}
                </section>

                {/* Quick Stats Chart */}
                <section className="mb-8">
                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-6 shadow-soft border border-gray-50 dark:border-gray-800">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest">Views Last 7 Days</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">245</span>
                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-black flex items-center">
                                        <span className="material-symbols-outlined text-[14px] mr-0.5 font-bold">trending_up</span>
                                        12%
                                    </span>
                                </div>
                            </div>
                            <Link href="/dashboard/seller/analytics" className="btn-ghost !h-auto !py-2 !px-3 !rounded-xl !bg-gray-50 dark:!bg-gray-800">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Report</span>
                                <span className="material-symbols-outlined text-[14px] text-gray-400">chevron_right</span>
                            </Link>
                        </div>
                        
                        <div className="h-24 w-full relative">
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 350 100">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2"></stop>
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>
                                <path d="M0 80 C 40 80, 50 40, 100 40 C 150 40, 160 70, 200 60 C 240 50, 260 20, 300 30 C 330 38, 340 10, 350 10" fill="none" stroke="var(--primary)" strokeLinecap="round" strokeWidth="3" vectorEffect="non-scaling-stroke"></path>
                                <path d="M0 80 C 40 80, 50 40, 100 40 C 150 40, 160 70, 200 60 C 240 50, 260 20, 300 30 C 330 38, 340 10, 350 10 V 100 H 0 Z" fill="url(#chartGradient)" stroke="none"></path>
                                <circle className="fill-white dark:fill-surface-dark stroke-primary stroke-2" cx="300" cy="30" r="4"></circle>
                            </svg>
                        </div>
                        <div className="flex justify-between mt-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                        </div>
                    </div>
                </section>

                {/* Subscriptions Status */}
                {(pendingSubscriptions?.length > 0 || !isSubscribed || daysUntilExpiry <= 7) && (
                    <section className="mb-8 space-y-3">
                        <h3 className="text-sm font-black text-text-primary-light dark:text-white px-1 mb-2 uppercase tracking-tight">Alerts</h3>
                        
                        {pendingSubscriptions?.map(sub => (
                            <div key={sub.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="size-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">pending_actions</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Payment Pending</p>
                                        <p className="text-[10px] font-bold text-amber-700/70 dark:text-amber-400/70 break-all leading-tight">Ref: {sub.payment_reference}</p>
                                    </div>
                                </div>
                                <ManualActivationButton 
                                    subscriptionId={sub.id} 
                                    paymentReference={sub.payment_reference}
                                />
                            </div>
                        ))}

                        {!isSubscribed && pendingSubscriptions?.length === 0 && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
                                    </div>
                                    <p className="text-sm font-black text-red-900 dark:text-red-100 uppercase tracking-tight">Expired</p>
                                </div>
                                <Link href="/sell#plans" className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest underline decoration-2 underline-offset-4">Renew</Link>
                            </div>
                        )}

                        {isSubscribed && daysUntilExpiry <= 7 && (
                            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                                <div className="size-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-lg">info</span>
                                </div>
                                <p className="text-sm font-black text-primary uppercase tracking-tight">
                                    Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                                </p>
                            </div>
                        )}
                    </section>
                )}

                {/* Recent Listings */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Listings</h3>
                        <Link href="/dashboard/seller/listings" className="text-primary text-xs font-black uppercase tracking-widest">Manage All</Link>
                    </div>
                    
                    <div className="space-y-3">
                        {listings?.slice(0, 5).map(item => (
                            <div key={item.id} className="bg-white dark:bg-surface-dark rounded-3xl p-3 shadow-soft border border-gray-100 dark:border-gray-800 flex items-center gap-4 group active:scale-[0.98] transition-all">
                                <div className="size-16 rounded-2xl bg-gray-50 dark:bg-gray-800 shrink-0 overflow-hidden relative border border-gray-100 dark:border-gray-700">
                                    {item.image_url ? (
                                        <Image src={item.image_url} alt={item.title} fill className="object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-300">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-gray-900 dark:text-white truncate text-sm uppercase tracking-tight">{item.title}</h4>
                                    <p className="text-xs font-black text-primary mt-0.5">₵{parseFloat(item.price || 0).toFixed(2)}</p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className={`size-1.5 rounded-full ${item.status === 'Active' ? 'bg-green-500' : item.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                        <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.status || 'Active'}</span>
                                    </div>
                                </div>
                                <Link href={`/marketplace/${item.id}`} className="size-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </Link>
                            </div>
                        ))}

                        {(!listings || listings.length === 0) && (
                            <div className="text-center py-12 bg-white dark:bg-surface-dark rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800 shadow-soft">
                                <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">inventory_2</span>
                                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">No listings yet</p>
                                <Link href="/dashboard/seller/create" className="text-primary text-[10px] font-black uppercase tracking-widest underline underline-offset-4 mt-2 inline-block">Start Selling</Link>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
