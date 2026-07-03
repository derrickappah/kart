'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function MyListingsClient({ initialProducts }) {
    const router = useRouter();
    const supabase = createClient();
    const [activeTab, setActiveTab] = useState('Active');
    const [products, setProducts] = useState(initialProducts || []);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);

    const toggleMenu = (productId, e) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === productId ? null : productId);
    };

    const handleDeleteClick = (product, e) => {
        if (e) e.stopPropagation();
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== productToDelete.id));
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };


    const filteredProducts = products.filter(product => {
        const status = product.status || 'Active';
        if (activeTab === 'Active') return status === 'Active';
        if (activeTab === 'Sold') return status === 'Sold' || status === 'Completed';
        if (activeTab === 'Expired') return status === 'Expired';
        return true;
    });

    const handleCardClick = (productId) => {
        router.push(`/dashboard/seller/listings/${productId}`);
    };

    const handleEditClick = (productId, e) => {
        if (e) e.stopPropagation();
        router.push(`/dashboard/seller/listings/edit/${productId}`);
    };

    const tabs = ['Active', 'Sold', 'Expired'];

    return (
        <div className="bg-white dark:bg-[#242428] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-white dark:bg-[#242428] shadow-2xl overflow-hidden">

                {/* Main Content */}
                <main className="flex-1 px-4 py-8 space-y-6 pb-32 overflow-y-auto no-scrollbar">
                    {/* Section Title & Tabs */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-2">My Listings</h3>

                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`chip ${activeTab === tab ? 'chip-active' : 'chip-inactive'} whitespace-nowrap`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredProducts.length > 0 ? (
                        <div className="space-y-4">
                            {filteredProducts.map((product) => (
                                <article
                                    key={product.id}
                                    onClick={() => handleCardClick(product.id)}
                                    className="group relative flex flex-col bg-white dark:bg-[#1e292b] rounded-2xl shadow-soft border border-transparent dark:border-white/5 transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.99]"
                                >
                                    <div className="flex gap-3 p-3">
                                        {/* Thumbnail */}
                                        <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                                            {product.image_url ? (
                                                <Image
                                                    src={product.image_url}
                                                    alt={product.title}
                                                    fill
                                                    className={`object-cover transition-transform duration-500 group-hover:scale-110 ${activeTab !== 'Active' ? 'grayscale opacity-60' : ''}`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                    <DynamicLucideIcon name="image" className="text-xl" />
                                                </div>
                                            )}

                                            {activeTab === 'Active' && (new Date() - new Date(product.created_at)) < 86400000 && (
                                                <div className="absolute top-1.5 left-1.5 bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md text-[8px] font-bold text-white shadow-sm uppercase tracking-wider">
                                                    New
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                         <div className="flex flex-col flex-1 justify-start py-0.5 min-w-0">
                                            <div className="space-y-1">
                                                <h3 className="text-[13px] font-bold leading-tight text-slate-900 dark:text-white line-clamp-1">
                                                    {product.title}
                                                </h3>
                                            </div>

                                             <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2">
                                                <p className="text-[13px] font-extrabold text-primary">
                                                    ₵{parseFloat(product.price || 0).toFixed(2)}
                                                </p>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {activeTab !== 'Active' && (
                                                        <div className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${activeTab === 'Sold' ? 'text-blue-500 bg-blue-500/10' :
                                                            'text-slate-500 bg-slate-500/10'
                                                            }`}>
                                                            {activeTab === 'Sold' ? 'Completed' : activeTab}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    {activeTab === 'Active' && (
                                        <div className="flex border-t border-slate-50 dark:border-white/5">
                                            <button
                                                onClick={(e) => handleEditClick(product.id, e)}
                                                className="flex-1 flex items-center justify-center py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                            >
                                                <DynamicLucideIcon name="edit_square" className="text-[16px] mr-1.5" />
                                                Edit
                                            </button>
                                            <div className="w-px bg-slate-50 dark:bg-white/5"></div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/seller/listings/promote/${product.id}`);
                                                }}
                                                className={`flex-1 flex items-center justify-center py-3 text-[11px] font-bold transition-all ${
                                                    (product.is_featured || (product.is_boosted && product.boost_expires_at && new Date(product.boost_expires_at) > new Date()))
                                                        ? 'text-orange-500 hover:bg-orange-500/5'
                                                        : 'text-primary hover:bg-primary/5'
                                                }`}
                                            >
                                                <DynamicLucideIcon name="rocket_launch" className="text-[16px] mr-1.5" />
                                                {(product.is_featured || (product.is_boosted && product.boost_expires_at && new Date(product.boost_expires_at) > new Date())) ? 'Extend Boost' : 'Promote'}
                                            </button>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
                            <div className="size-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <DynamicLucideIcon name="inventory_2" className="text-4xl opacity-50" />
                            </div>
                            <p className="font-bold text-lg text-slate-900 dark:text-white mb-1">No {activeTab.toLowerCase()} listings</p>
                            <p className="text-sm mb-6 text-center">You don&apos;t have any items in this category yet.</p>
                            <Link href="/dashboard/seller/create" className="h-12 flex items-center justify-center px-8 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-[0.98]">
                                Create New Listing
                            </Link>
                        </div>
                    )}
                </main>



                {/* Delete Confirmation Modal */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="relative w-full max-w-[320px] bg-white dark:bg-[#1a1d21] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/10">
                            {/* Decorative Top Pattern */}
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none"></div>

                            <div className="flex flex-col items-center pt-8 px-6 pb-6 relative z-10">
                                {/* Icon Wrapper */}
                                <div className="relative mb-5 group">
                                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-20"></div>
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center relative ring-4 ring-white dark:ring-[#1a1d21]">
                                        <DynamicLucideIcon name="warning" className="text-[32px] text-red-500 fill-1" />
                                    </div>
                                </div>

                                {/* Text Content */}
                                <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white text-center leading-tight mb-3">Delete Listing?</h2>
                                <p className="text-center text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed mb-8">
                                    Are you sure you want to remove <br />
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">&quot;{productToDelete?.title}&quot;</span>
                                    This action cannot be undone.
                                </p>

                                {/* Action Buttons */}
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isDeleting}
                                        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-all text-white font-bold text-[15px] tracking-wide shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)] disabled:opacity-70"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                    <button
                                        onClick={() => setIsDeleteModalOpen(false)}
                                        disabled={isDeleting}
                                        className="w-full h-12 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all text-slate-600 dark:text-slate-300 font-bold text-[15px] tracking-wide"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
