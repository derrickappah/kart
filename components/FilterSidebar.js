'use client';
import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const categories = [
    'All', 'Textbooks', 'Electronics', 'Dorm Furniture', 'Clothing',
    'School Supplies', 'Tickets & Events', 'Services & Tutoring',
    'Beauty & Grooming', 'Sports & Fitness', 'Kitchenware',
    'Musical Instruments', 'Games & Consoles', 'Health & Wellness',
    'Arts & Crafts', 'Home Appliances'
];
const conditions = ['New', 'Like New', 'Good', 'Fair'];
const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: 'schedule' },
    { value: 'oldest', label: 'Oldest First', icon: 'history' },
    { value: 'price-low', label: 'Price: Low to High', icon: 'trending_up' },
    { value: 'price-high', label: 'Price: High to Low', icon: 'trending_down' },
];

export default function FilterSidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);

    // Initialize state from URL params
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [campus, setCampus] = useState('');
    const [sort, setSort] = useState('newest');

    // Sync with URL params when they change
    useEffect(() => {
        const categoryParam = searchParams?.get('category');
        const conditionParam = searchParams?.get('condition');
        setSelectedCategories(categoryParam ? categoryParam.split(',') : []);
        setSelectedConditions(conditionParam ? conditionParam.split(',') : []);
        setMinPrice(searchParams?.get('minPrice') || '');
        setMaxPrice(searchParams?.get('maxPrice') || '');
        setCampus(searchParams?.get('campus') || '');
        setSort(searchParams?.get('sort') || 'newest');
    }, [searchParams]);

    // Handle Open Event
    useEffect(() => {
        const handleOpenFilters = () => {
            setIsOpen(true);
            setAnimatingOut(false);
            document.body.style.overflow = 'hidden';
        };
        window.addEventListener('open-filters', handleOpenFilters);
        return () => window.removeEventListener('open-filters', handleOpenFilters);
    }, []);

    const closeSidebar = () => {
        setAnimatingOut(true);
        setTimeout(() => {
            setIsOpen(false);
            setAnimatingOut(false);
            document.body.style.overflow = 'unset';
        }, 300);
    };

    const updateFilters = (categories, conditions, min, max, campusValue, sortValue) => {
        const params = new URLSearchParams();
        if (searchParams?.get('search')) params.set('search', searchParams.get('search'));
        
        const filteredCategories = categories.filter(c => c !== 'All');
        if (filteredCategories.length > 0) params.set('category', filteredCategories.join(','));
        if (conditions.length > 0) params.set('condition', conditions.join(','));
        if (min) params.set('minPrice', min);
        if (max) params.set('maxPrice', max);
        if (campusValue) params.set('campus', campusValue);
        if (sortValue && sortValue !== 'newest') params.set('sort', sortValue);

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
        updateFilters(selectedCategories, selectedConditions, minPrice, maxPrice, campus, sort);
        closeSidebar();
    };

    const handleReset = () => {
        setSelectedCategories([]);
        setSelectedConditions([]);
        setMinPrice('');
        setMaxPrice('');
        setCampus('');
        setSort('newest');
        updateFilters([], [], '', '', '', 'newest');
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${animatingOut ? 'opacity-0' : 'animate-fade-in'}`}>
            <div className="absolute inset-0" onClick={closeSidebar} />

            <div className={`relative w-full bg-white dark:bg-[#242428] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] ${animatingOut ? 'translate-y-full transition-transform duration-300' : 'animate-slide-up'}`}>
                {/* Handle */}
                <div className="w-full flex justify-center pt-4 pb-1">
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Filter & Sort</h2>
                    <button onClick={handleReset} className="text-sm font-bold text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors">
                        Reset
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
                    {/* Sort Options */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">sort</span>
                            <h3 className="font-bold text-lg">Sort By</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            {sortOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSort(opt.value)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left ${sort === opt.value
                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                        : 'border-transparent bg-gray-50 dark:bg-[#2d2d32] text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    <div className={`flex items-center justify-center size-10 rounded-xl ${sort === opt.value ? 'bg-primary text-white' : 'bg-white dark:bg-[#242428] text-gray-400'}`}>
                                        <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                                    </div>
                                    <span className="font-bold text-sm flex-1">{opt.label}</span>
                                    {sort === opt.value && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <span className="material-symbols-outlined text-primary">payments</span>
                            <h3 className="font-bold text-lg">Price Range</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Min Price', val: minPrice, set: setMinPrice },
                                { label: 'Max Price', val: maxPrice, set: setMaxPrice }
                            ].map((field, i) => (
                                <div key={i} className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{field.label}</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs transition-colors group-focus-within:text-primary">₵</span>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-2xl py-4 pl-10 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all placeholder:text-gray-300"
                                            placeholder={i === 0 ? "0" : "Any"}
                                            value={field.val}
                                            onChange={(e) => field.set(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
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
                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 font-bold text-sm ${selectedConditions.includes(con)
                                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'border-transparent bg-gray-50 dark:bg-[#2d2d32] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
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
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border-2 ${selectedCategories.includes(cat) || (cat === 'All' && selectedCategories.length === 0)
                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                                        : 'bg-white dark:bg-[#2d2d32] text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-200'
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
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl group-focus-within:text-primary transition-colors">location_searching</span>
                            <input
                                type="text"
                                className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                placeholder="Enter campus name..."
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-[#242428]/80 backdrop-blur-lg z-10">
                    <button
                        onClick={handleApply}
                        disabled={isPending}
                        className="btn-primary w-full h-14 rounded-2xl shadow-xl shadow-primary/25 flex items-center justify-center"
                    >
                        {isPending ? <div className="size-6 border-2 border-white border-t-transparent animate-spin rounded-full" /> : 'Apply Filters & Sort'}
                    </button>
                </div>
            </div>
        </div>
    );
}