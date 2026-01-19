'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function MyListingsClient({ initialProducts }) {
    const router = useRouter();
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

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            // Mock delete for now, integrate with Supabase later if needed
            // const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
            setProducts(products.filter(p => p.id !== productToDelete.id));
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        } catch (error) {
            console.error('Error deleting product:', error);
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

    const handleEditClick = (productId) => {
        router.push(`/dashboard/seller/listings/edit/${productId}`);
    };

    const tabs = ['Active', 'Sold', 'Expired'];

    return (
        <div className="bg-[#f6f7f9] dark:bg-[#1a1d21] font-display antialiased min-h-screen transition-colors duration-200">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f9] dark:bg-[#1a1d21] overflow-x-hidden shadow-2xl">
                {/* Header */}
                <header className="sticky top-0 z-20 bg-[#f6f7f9]/95 dark:bg-[#1a1d21]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="flex items-center px-4 pt-0 pb-4 justify-between">
                        <button 
                            onClick={() => router.back()}
                            className="text-[#0e191b] dark:text-[#e0e6e8] flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h2 className="text-[#0e191b] dark:text-[#e0e6e8] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                            My Listings
                        </h2>
                    </div>
                    {/* Tabs */}
                    <div className="px-4">
                        <div className="flex relative">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`group flex flex-col items-center justify-center border-b-[3px] pb-3 flex-1 cursor-pointer transition-all duration-300 ${
                                        activeTab === tab 
                                        ? 'border-[#149cb8]' 
                                        : 'border-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-t-lg'
                                    }`}
                                >
                                    <p className={`text-sm font-bold leading-normal tracking-wide transition-colors ${
                                        activeTab === tab ? 'text-[#149cb8]' : 'text-[#4e8b97] dark:text-[#94aab0]'
                                    }`}>
                                        {tab}
                                    </p>
                                    {activeTab === tab && (
                                        <span className="absolute -bottom-[3px] w-1/3 h-[3px] bg-[#149cb8] rounded-t-sm shadow-[0_-2px_8px_rgba(20,156,184,0.4)] transition-all duration-300"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-4 py-6 space-y-5 pb-24">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                            <article 
                                key={product.id}
                                onClick={() => handleCardClick(product.id)}
                                className={`group relative flex flex-col bg-white dark:bg-[#22262a] rounded-xl shadow-sm hover:shadow-[0_4px_20px_-2px_rgba(20,156,184,0.08)] transition-all duration-300 border border-transparent hover:border-[#149cb8]/20 overflow-hidden cursor-pointer ${
                                    activeTab === 'Expired' ? 'border-dashed border-gray-300 dark:border-gray-700' : ''
                                }`}
                            >
                                <div className="flex gap-4 p-3">
                                    {/* Thumbnail */}
                                    <div className={`relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 ${
                                        activeTab === 'Sold' ? 'grayscale-[50%] group-hover:grayscale-0' : 
                                        activeTab === 'Expired' ? 'grayscale' : ''
                                    }`}>
                                        {product.image_url ? (
                                            <div className="relative w-full h-full">
                                                <Image 
                                                    src={product.image_url} 
                                                    alt={product.title}
                                                    fill
                                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-gray-400">image</span>
                                            </div>
                                        )}
                                        {activeTab === 'Active' && (new Date() - new Date(product.created_at)) < 86400000 && (
                                            <div className="absolute top-1 left-1 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-[#149cb8] shadow-sm">
                                                JUST POSTED
                                            </div>
                                        )}
                                        {activeTab === 'Sold' && (
                                            <div className="absolute inset-0 bg-emerald-900/20 flex items-center justify-center backdrop-blur-[1px]">
                                                <span className="material-symbols-outlined text-white text-3xl drop-shadow-md">check_circle</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex flex-col flex-1 justify-between py-0.5 min-w-0">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <h3 className={`text-base font-bold leading-tight line-clamp-2 ${
                                                    activeTab === 'Active' ? 'text-[#0e191b] dark:text-[#e0e6e8]' : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                    {product.title}
                                                </h3>
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => toggleMenu(product.id, e)}
                                                        className="text-gray-400 hover:text-[#149cb8] dark:text-gray-500 transition-colors p-1"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">more_horiz</span>
                                                    </button>
                                                    
                                                    {activeMenuId === product.id && (
                                                        <>
                                                            <div 
                                                                className="fixed inset-0 z-[60]" 
                                                                onClick={() => setActiveMenuId(null)}
                                                            ></div>
                                                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#22262a] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-[70] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                                                <button 
                                                                    onClick={() => handleEditClick(product.id)}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#0e191b] dark:text-[#e0e6e8] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                    Edit Listing
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteClick(product)}
                                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                    Delete Listing
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                {activeTab === 'Active' ? (
                                                    <>
                                                        <span className="flex items-center text-xs text-[#4e8b97] dark:text-[#94aab0] font-medium">
                                                            <span className="material-symbols-outlined text-[14px] mr-0.5">visibility</span> 
                                                            {product.views || 0}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                                        <span className="flex items-center text-xs text-[#4e8b97] dark:text-[#94aab0] font-medium">
                                                            <span className="material-symbols-outlined text-[14px] mr-0.5">favorite</span> 
                                                            {product.likes || 0}
                                                        </span>
                                                    </>
                                                ) : activeTab === 'Sold' ? (
                                                    <p className="text-xs text-[#4e8b97] dark:text-[#94aab0] mt-1 font-medium">
                                                        Sold on {new Date(product.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-red-500/80 mt-1 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">timer_off</span> Expired
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between mt-2">
                                            <p className={`text-lg font-bold leading-none ${
                                                activeTab === 'Active' ? 'text-[#149cb8]' : 
                                                activeTab === 'Sold' ? 'text-[#0e191b] dark:text-[#e0e6e8] line-through decoration-[#149cb8]/50 opacity-60' :
                                                'text-gray-400'
                                            }`}>
                                                ₵{parseFloat(product.price || 0).toFixed(2)}
                                            </p>
                                            <div className={`flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md shadow-sm ${
                                                activeTab === 'Active' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                                                activeTab === 'Sold' ? 'text-white bg-emerald-500' :
                                                'text-gray-500 bg-gray-200 dark:bg-gray-700'
                                            }`}>
                                                {activeTab === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>}
                                                {activeTab}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className={`flex border-t border-gray-100 dark:border-gray-800 divide-x divide-gray-100 dark:divide-gray-800 ${
                                    activeTab === 'Expired' ? 'bg-white/50 dark:bg-black/20' : ''
                                }`}>
                                    {activeTab === 'Active' && (
                                        <>
                                            <button 
                                                onClick={() => handleEditClick(product.id)}
                                                className="flex-1 flex items-center justify-center py-2.5 text-[#4e8b97] dark:text-[#94aab0] hover:text-[#149cb8] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs font-semibold gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-base">edit</span>
                                                Edit
                                            </button>
                                            <button className="flex-1 flex items-center justify-center py-2.5 text-[#149cb8] hover:text-white hover:bg-[#149cb8] transition-colors text-xs font-bold gap-1.5">
                                                <span className="material-symbols-outlined text-base">campaign</span>
                                                Promote Listing
                                            </button>
                                        </>
                                    )}
                                    {activeTab === 'Sold' && (
                                        <button className="flex-1 flex items-center justify-center py-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors text-xs font-bold gap-1.5 w-full">
                                            <span className="material-symbols-outlined text-base">receipt_long</span>
                                            View Sale Details
                                        </button>
                                    )}
                                    {activeTab === 'Expired' && (
                                        <>
                                            <button 
                                                onClick={() => handleDeleteClick(product)}
                                                className="flex-1 flex items-center justify-center py-2.5 text-[#4e8b97] dark:text-[#94aab0] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-xs font-semibold gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                                Delete
                                            </button>
                                            <button className="flex-1 flex items-center justify-center py-2.5 text-[#149cb8] hover:bg-[#149cb8]/5 transition-colors text-xs font-bold gap-1.5">
                                                <span className="material-symbols-outlined text-base">refresh</span>
                                                Renew
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-gray-800 mb-4">inventory_2</span>
                            <p className="text-gray-400 font-bold">No {activeTab.toLowerCase()} listings found</p>
                        </div>
                    )}
                    {/* Bottom Spacer */}
                    <div className="h-16"></div>
                </main>

                {/* Floating Action Button */}
                <Link 
                    href="/dashboard/seller/create"
                    className="fixed bottom-24 right-6 shadow-[0_8px_30px_rgb(20,156,184,0.4)] bg-[#149cb8] text-white size-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 z-50 group"
                >
                    <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
                </Link>

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
                                        <span className="material-symbols-outlined text-[32px] text-red-500 fill-1">warning</span>
                                    </div>
                                </div>

                                {/* Text Content */}
                                <h2 className="text-[22px] font-extrabold text-slate-900 dark:text-white text-center leading-tight mb-3">Delete Listing?</h2>
                                <p className="text-center text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed mb-8">
                                    Are you sure you want to remove <br/> 
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mt-1">"{productToDelete?.title}"</span> 
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
