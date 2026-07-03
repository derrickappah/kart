'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, useRef, useTransition } from 'react';
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

    // Ref for focus trap: first focusable element in the panel
    const closeButtonRef = useRef(null);
    const lastFocusableRef = useRef(null);

    // Initialize state from URL params
    const getInitialCategories = () => searchParams?.get('category') ? searchParams.get('category').split(',') : [];
    const getInitialConditions = () => searchParams?.get('condition') ? searchParams.get('condition').split(',') : [];
    const getInitialMinPrice = () => searchParams?.get('minPrice') || '';
    const getInitialMaxPrice = () => searchParams?.get('maxPrice') || '';
    const getInitialCampus = () => searchParams?.get('campus') || '';
    const getInitialSort = () => searchParams?.get('sort') || 'newest';

    const [selectedCategories, setSelectedCategories] = useState(getInitialCategories);
    const [selectedConditions, setSelectedConditions] = useState(getInitialConditions);
    const [minPrice, setMinPrice] = useState(getInitialMinPrice);
    const [maxPrice, setMaxPrice] = useState(getInitialMaxPrice);
    const [campus, setCampus] = useState(getInitialCampus);
    const [sort, setSort] = useState(getInitialSort);
    const [prevSearchQuery, setPrevSearchQuery] = useState(searchParams?.toString() || '');

    // Sync with URL params when they change directly during render
    const currentSearchQuery = searchParams?.toString() || '';
    if (currentSearchQuery !== prevSearchQuery) {
        setPrevSearchQuery(currentSearchQuery);
        const categoryParam = searchParams?.get('category');
        const conditionParam = searchParams?.get('condition');
        setSelectedCategories(categoryParam ? categoryParam.split(',') : []);
        setSelectedConditions(conditionParam ? conditionParam.split(',') : []);
        setMinPrice(searchParams?.get('minPrice') || '');
        setMaxPrice(searchParams?.get('maxPrice') || '');
        setCampus(searchParams?.get('campus') || '');
        setSort(searchParams?.get('sort') || 'newest');
    }

    // Handle Open Event & focus management
    useEffect(() => {
        const handleOpenFilters = () => {
            setIsOpen(true);
            setAnimatingOut(false);
            document.body.style.overflow = 'hidden';
            // Move focus to the close button after the drawer animates in
            setTimeout(() => closeButtonRef.current?.focus(), 50);
        };
        window.addEventListener('open-filters', handleOpenFilters);
        return () => window.removeEventListener('open-filters', handleOpenFilters);
    }, []);

    // Focus trap: keep Tab/Shift+Tab inside the panel while it's open
    const handleKeyDown = (e) => {
        if (!isOpen) return;

        if (e.key === 'Escape') {
            closeSidebar();
            return;
        }

        if (e.key === 'Tab') {
            const focusableSelectors = [
                'button:not([disabled])',
                'input:not([disabled])',
                '[role="button"]:not([disabled])',
            ].join(', ');
            const panel = e.currentTarget;
            const focusableElements = Array.from(panel.querySelectorAll(focusableSelectors));
            if (focusableElements.length === 0) return;
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    };

    const closeSidebar = () => {
        setAnimatingOut(true);
        setTimeout(() => {
            setIsOpen(false);
            setAnimatingOut(false);
            document.body.style.overflow = 'unset';
        }, 300);
    };

    const updateFilters = (cats, conds, min, max, campusValue, sortValue) => {
        const params = new URLSearchParams();
        if (searchParams?.get('search')) params.set('search', searchParams.get('search'));

        const filteredCategories = cats.filter(c => c !== 'All');
        if (filteredCategories.length > 0) params.set('category', filteredCategories.join(','));
        if (conds.length > 0) params.set('condition', conds.join(','));
        // Only set price params if they are valid non-negative numbers
        if (min !== '' && !isNaN(Number(min)) && Number(min) >= 0) params.set('minPrice', min);
        if (max !== '' && !isNaN(Number(max)) && Number(max) >= 0) params.set('maxPrice', max);
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
        // Close the sidebar after reset for a cleaner UX
        closeSidebar();
    };

    if (!isOpen) return null;

    return (
        /* Overlay */
        <div
            className={`fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${animatingOut ? 'opacity-0' : 'animate-fade-in'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort listings"
        >
            {/* Backdrop click to close */}
            <button
                className="absolute inset-0 w-full h-full bg-transparent cursor-default border-none outline-none"
                onClick={closeSidebar}
                aria-label="Close filters overlay"
                tabIndex={-1}
            />

            {/* Drawer panel */}
            <div
                className={`relative w-full bg-white dark:bg-[#242428] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] ${animatingOut ? 'translate-y-full transition-transform duration-300' : 'animate-slide-up'}`}
                onKeyDown={handleKeyDown}
            >
                {/* Drag handle */}
                <div className="w-full flex justify-center pt-4 pb-1" aria-hidden="true">
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 pb-4 pt-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <button
                            ref={closeButtonRef}
                            onClick={closeSidebar}
                            aria-label="Close filters"
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#2d2d32] text-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <DynamicLucideIcon name="close" size={24} aria-hidden="true" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Filter &amp; Sort</h2>
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-sm font-bold text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        Reset
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
                    {/* Sort Options */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="sort" className="text-primary" aria-hidden="true" />
                            <h3 className="font-bold text-lg" id="sort-heading">Sort By</h3>
                        </div>
                        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="sort-heading">
                            {sortOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    role="radio"
                                    aria-checked={sort === opt.value}
                                    onClick={() => setSort(opt.value)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${sort === opt.value
                                        ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                        : 'border-transparent bg-gray-50 dark:bg-[#2d2d32] text-gray-600 dark:text-gray-300'
                                    }`}
                                >
                                    <div className={`flex items-center justify-center size-10 rounded-xl ${sort === opt.value ? 'bg-primary text-white' : 'bg-white dark:bg-[#242428] text-gray-400'}`}>
                                        <DynamicLucideIcon name={opt.icon} className="text-[20px]" aria-hidden="true" />
                                    </div>
                                    <span className="font-bold text-sm flex-1">{opt.label}</span>
                                    {sort === opt.value && (
                                        <DynamicLucideIcon name="check_circle" className="text-primary" aria-hidden="true" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="payments" className="text-primary" aria-hidden="true" />
                            <h3 className="font-bold text-lg">Price Range</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Min Price', id: 'filter-min-price', val: minPrice, set: setMinPrice, placeholder: '0' },
                                { label: 'Max Price', id: 'filter-max-price', val: maxPrice, set: setMaxPrice, placeholder: 'Any' }
                            ].map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <label
                                        htmlFor={field.id}
                                        className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1"
                                    >
                                        {field.label}
                                    </label>
                                    <div className="relative group">
                                        <span
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xs transition-colors group-focus-within:text-primary"
                                            aria-hidden="true"
                                        >
                                            ₵
                                        </span>
                                        <input
                                            id={field.id}
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-2xl py-4 pl-10 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all placeholder:text-gray-300"
                                            placeholder={field.placeholder}
                                            value={field.val}
                                            onChange={(e) => field.set(e.target.value)}
                                            min="0"
                                            step="any"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="verified" className="text-primary" aria-hidden="true" />
                            <h3 className="font-bold text-lg" id="condition-heading">Condition</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="condition-heading">
                            {conditions.map((con) => (
                                <button
                                    key={con}
                                    onClick={() => toggleCondition(con)}
                                    aria-pressed={selectedConditions.includes(con)}
                                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedConditions.includes(con)
                                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                        : 'border-transparent bg-gray-50 dark:bg-[#2d2d32] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <DynamicLucideIcon
                                        name={con === 'New' ? 'new_releases' : con === 'Like New' ? 'thumb_up' : con === 'Good' ? 'handshake' : 'build'}
                                        className="text-[20px]"
                                        aria-hidden="true"
                                    />
                                    {con}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="category" className="text-primary" aria-hidden="true" />
                            <h3 className="font-bold text-lg" id="categories-heading">Categories</h3>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="categories-heading">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    aria-pressed={selectedCategories.includes(cat) || (cat === 'All' && selectedCategories.length === 0)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedCategories.includes(cat) || (cat === 'All' && selectedCategories.length === 0)
                                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                                        : 'bg-white dark:bg-[#2d2d32] text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Campus / Location */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="near_me" className="text-primary" aria-hidden="true" />
                            <h3 className="font-bold text-lg">
                                <label htmlFor="filter-campus">Location</label>
                            </h3>
                        </div>
                        <div className="relative group">
                            <DynamicLucideIcon
                                name="location_searching"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl group-focus-within:text-primary transition-colors"
                                aria-hidden="true"
                            />
                            <input
                                id="filter-campus"
                                type="text"
                                className="w-full bg-gray-50 dark:bg-[#2d2d32] border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary transition-all"
                                placeholder="Enter campus name..."
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                                maxLength={100}
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Footer CTA */}
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-[#242428]/80 backdrop-blur-lg z-10">
                    <button
                        ref={lastFocusableRef}
                        onClick={handleApply}
                        disabled={isPending}
                        className="btn-primary w-full h-14 rounded-2xl shadow-xl shadow-primary/25 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        {isPending
                            ? <div className="size-6 border-2 border-white border-t-transparent animate-spin rounded-full" aria-label="Applying filters…" />
                            : 'Apply Filters & Sort'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}