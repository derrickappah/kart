'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';

export default function EditListingClient({ product }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: product?.title || '',
        price: product?.price || '',
        category: product?.category || 'Other',
        condition: product?.condition || 'Good',
        description: product?.description || '',
        image_url: product?.image_url || ''
    });

    const categories = ['Textbooks', 'Electronics', 'Furniture', 'Clothing', 'Other'];
    const conditions = ['Like New', 'Good', 'Fair'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({
                    title: formData.title,
                    price: parseFloat(formData.price),
                    category: formData.category,
                    condition: formData.condition,
                    description: formData.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', product.id);

            if (error) throw error;
            router.push('/dashboard/seller/listings');
            router.refresh();
        } catch (error) {
            console.error('Error updating listing:', error);
            alert('Failed to update listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f7f9] dark:bg-[#1a1d21] font-display antialiased transition-colors duration-200 min-h-screen">
            <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto bg-[#f6f7f9] dark:bg-[#1a1d21] overflow-x-hidden shadow-2xl">
                {/* Header */}
                <header className="sticky top-0 z-[100] bg-[#f6f7f9]/95 dark:bg-[#1a1d21]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="flex items-center px-4 pt-4 pb-4 justify-between">
                        <button
                            onClick={() => router.back()}
                            className="text-[#0e191b] dark:text-[#e0e6e8] flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                        <h2 className="text-[#0e191b] dark:text-[#e0e6e8] text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
                            Edit Listing
                        </h2>
                    </div>
                </header>

                <main className="flex-1 px-5 py-6 space-y-8 pb-32">
                    {/* Photos Section */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[#0e191b] dark:text-[#e0e6e8] font-bold text-sm">Photos</label>
                            <span className="text-xs text-[#4e8b97] dark:text-[#94aab0] font-medium">1/5 added</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 no-scrollbar">
                            <button className="shrink-0 w-28 h-36 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#22262a] flex flex-col items-center justify-center gap-2 text-[#4e8b97] dark:text-[#94aab0] hover:border-[#149cb8] hover:text-[#149cb8] hover:bg-[#149cb8]/5 transition-all group">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">add</span>
                                </div>
                                <span className="text-xs font-bold">Add Photo</span>
                            </button>

                            {formData.image_url && (
                                <div className="relative shrink-0 w-28 h-36 rounded-2xl overflow-visible group">
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md">
                                        <Image
                                            src={formData.image_url}
                                            alt="Listing photo"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <button className="absolute -top-2 -right-2 bg-white dark:bg-gray-800 text-red-500 shadow-lg rounded-full w-7 h-7 flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700">
                                        <span className="material-symbols-outlined text-base">close</span>
                                    </button>
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-white">Main</div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Form Fields */}
                    <section className="space-y-6">
                        {/* Item Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="title">Item Name</label>
                            <div className="relative">
                                <input
                                    className="block w-full rounded-2xl border-0 py-4 px-4 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 transition-shadow font-medium"
                                    id="title"
                                    name="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400">edit</span>
                                </div>
                            </div>
                        </div>

                        {/* Price & Category */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="price">Price</label>
                                <div className="relative rounded-2xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="text-[#4e8b97] dark:text-[#94aab0] font-bold text-lg">₵</span>
                                    </div>
                                    <input
                                        className="block w-full rounded-2xl border-0 py-4 pl-9 pr-4 text-[#0e191b] dark:text-[#e0e6e8] bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-lg sm:leading-6 font-bold transition-shadow text-right"
                                        id="price"
                                        name="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="category">Category</label>
                                <div className="relative">
                                    <select
                                        className="block w-full rounded-2xl border-0 py-4 pl-4 pr-10 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 font-medium appearance-none transition-shadow"
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                        <span className="material-symbols-outlined text-gray-400">expand_more</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1">Condition</label>
                            <div className="grid grid-cols-3 gap-3">
                                {conditions.map(cond => (
                                    <button
                                        key={cond}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, condition: cond }))}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-xs font-bold shadow-sm ${formData.condition === cond
                                            ? 'border-[#149cb8] bg-[#149cb8]/5 text-[#149cb8] ring-1 ring-[#149cb8]'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#22262a] text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {cond}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-[#0e191b] dark:text-[#e0e6e8] ml-1" htmlFor="description">Description</label>
                            <textarea
                                className="block w-full rounded-2xl border-0 py-4 px-4 text-[#0e191b] dark:text-[#e0e6e8] shadow-sm bg-white dark:bg-[#22262a] ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#149cb8] sm:text-sm sm:leading-6 transition-shadow font-medium min-h-[120px]"
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Tell us more about your item..."
                            />
                        </div>
                    </section>
                </main>

                {/* Sticky Footer Action */}
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 dark:bg-[#22262a]/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] z-[100]">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-[#149cb8] hover:bg-[#149cb8]/90 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-[#149cb8]/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
