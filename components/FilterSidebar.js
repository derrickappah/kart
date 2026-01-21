'use client';
import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const categories = [
    'All',
    'Textbooks',
    'Electronics',
    'Dorm Furniture',
    'Clothing',
    'School Supplies',
    'Tickets & Events',
    'Services & Tutoring',
    'Beauty & Grooming',
    'Sports & Fitness',
    'Kitchenware',
    'Musical Instruments',
    'Games & Consoles',
    'Health & Wellness',
    'Arts & Crafts',
    'Lost & Found',
    'Home Appliances'
];
const conditions = ['New', 'Like New', 'Good', 'Fair'];

export default function FilterSidebar({ hideHeader = false }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);

    // Initialize state from URL params
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [campus, setCampus] = useState('');

    // Sync with URL params when they change
    useEffect(() => {
        const categoryParam = searchParams?.get('category');
        const conditionParam = searchParams?.get('condition');
        setSelectedCategories(categoryParam ? categoryParam.split(',') : []);
        setSelectedConditions(conditionParam ? conditionParam.split(',') : []);
        setMinPrice(searchParams?.get('minPrice') || '');
        setMaxPrice(searchParams?.get('maxPrice') || '');
        setCampus(searchParams?.get('campus') || '');
    }, [searchParams]);

    // Listen for custom event to open the sheet
    useEffect(() => {
        const handleOpenFilters = () => setIsOpen(true);
        window.addEventListener('open-filters', handleOpenFilters);
        return () => window.removeEventListener('open-filters', handleOpenFilters);
    }, []);

    const updateFilters = (categories, conditions, min, max, campusValue) => {
        const params = new URLSearchParams();
        if (searchParams?.get('search')) params.set('search', searchParams.get('search'));
        if (searchParams?.get('sort')) params.set('sort', searchParams.get('sort'));

        const filteredCategories = categories.filter(c => c !== 'All');
        if (filteredCategories.length > 0) params.set('category', filteredCategories.join(','));
        if (conditions.length > 0) params.set('condition', conditions.join(','));
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
        if (campusValue) params.set('campus', campusValue);

        const queryString = params.toString();
        startTransition(() => {
            router.replace(`/marketplace${queryString ? `?${queryString}` : ''}`);
        });
    };

    const toggleCategory = (category) => {
        let newCategories;
        if (category === 'All') {
            newCategories = [];
        } else {
            if (selectedCategories.includes(category)) {
                newCategories = selectedCategories.filter(c => c !== category);
            } else {
                newCategories = [...selectedCategories, category];
            }
        }
        setSelectedCategories(newCategories);
    };

    const toggleCondition = (condition) => {
        const newConditions = selectedConditions.includes(condition)
            ? selectedConditions.filter(c => c !== condition)
            : [...selectedConditions, condition];
        setSelectedConditions(newConditions);
    };

    const handleApply = () => {
        updateFilters(selectedCategories, selectedConditions, minPrice, maxPrice, campus);
        setIsOpen(false);
    };

    const handleReset = () => {
        setSelectedCategories([]);
        setSelectedConditions([]);
        setMinPrice('');
        setMaxPrice('');
        setCampus('');
        updateFilters([], [], '', '', '');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div
                className="absolute inset-0"
                onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full bg-white dark:bg-[#242428] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] transition-transform duration-300 animate-in slide-in-from-bottom">
                {/* Handle */}
                <div className="w-full flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Filters</h2>
                    <button
                        onClick={handleReset}
                        className="text-sm font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                    {/* Price Range */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">payments</span>
                            <h3 className="font-bold text-lg">Price Range</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Min Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">GHS</span>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="0"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Max Price</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">GHS</span>
                                    <input
                                        type="number"
                                        className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="Any"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">verified</span>
                            <h3 className="font-bold text-lg">Condition</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {conditions.map((con) => (
                                <button
                                    key={con}
                                    onClick={() => toggleCondition(con)}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm ${selectedConditions.includes(con)
                                            ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                                            : 'border-transparent bg-gray-100 dark:bg-[#2d2d32] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {con === 'New' ? 'new_releases' : con === 'Like New' ? 'thumb_up' : con === 'Good' ? 'handshake' : 'build'}
                                    </span>
                                    {con}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">category</span>
                            <h3 className="font-bold text-lg">Categories</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${selectedCategories.includes(cat) || (cat === 'All' && selectedCategories.length === 0)
                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                            : 'bg-gray-50 dark:bg-[#2d2d32] text-gray-500 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campus */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">near_me</span>
                            <h3 className="font-bold text-lg">Location</h3>
                        </div>
                        <input
                            type="text"
                            className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-xl py-3.5 px-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                            placeholder="Enter campus name..."
                            value={campus}
                            onChange={(e) => setCampus(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#242428]">
                    <button
                        onClick={handleApply}
                        className="btn-primary w-full h-14 rounded-2xl shadow-xl shadow-primary/25"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}