'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Image from 'next/image';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { categoryDetails } from '@/utils/categories';

const conditions = ['New', 'Like New', 'Good', 'Fair', 'Acceptable'];

const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: 'schedule' },
    { value: 'oldest', label: 'Oldest First', icon: 'history' },
    { value: 'price-low', label: 'Price: Low to High', icon: 'trending_up' },
    { value: 'price-high', label: 'Price: High to Low', icon: 'trending_down' },
];

const pricePresets = [
    { label: 'Under ₵20', min: '', max: '20' },
    { label: 'Under ₵50', min: '', max: '50' },
    { label: 'Under ₵100', min: '', max: '100' },
    { label: 'Under ₵200', min: '', max: '200' },
];

const popularCampuses = [
    { name: 'University of Ghana', short: 'UG' },
    { name: 'KNUST', short: 'KNUST' },
    { name: 'University of Cape Coast', short: 'UCC' },
    { name: 'UPSA', short: 'UPSA' },
    { name: 'Ashesi University', short: 'Ashesi' },
    { name: 'Accra Technical University', short: 'ATU' }
];

export default function FilterSidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [showAllCategories, setShowAllCategories] = useState(false);

    // Focus trap refs
    const closeButtonRef = useRef(null);
    const lastFocusableRef = useRef(null);

    // Initial values from URL parameters
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

    // Synchronize UI states with URL params if updated externally
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

    // Modal open handler
    useEffect(() => {
        const handleOpenFilters = () => {
            setIsOpen(true);
            setAnimatingOut(false);
            document.body.style.overflow = 'hidden';
            setTimeout(() => closeButtonRef.current?.focus(), 50);
        };
        window.addEventListener('open-filters', handleOpenFilters);
        return () => window.removeEventListener('open-filters', handleOpenFilters);
    }, []);

    // Focus trap keyboard handler
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
        }, 280);
    };

    const updateFilters = (cats, conds, min, max, campusValue, sortValue) => {
        const params = new URLSearchParams(searchParams.toString());

        // Update or delete categories
        const filteredCategories = cats.filter(c => c !== 'All');
        if (filteredCategories.length > 0) {
            params.set('category', filteredCategories.join(','));
        } else {
            params.delete('category');
        }

        // Update or delete conditions
        if (conds.length > 0) {
            params.set('condition', conds.join(','));
        } else {
            params.delete('condition');
        }

        // Update or delete prices
        if (min !== '' && !isNaN(Number(min)) && Number(min) >= 0) {
            params.set('minPrice', min);
        } else {
            params.delete('minPrice');
        }

        if (max !== '' && !isNaN(Number(max)) && Number(max) >= 0) {
            params.set('maxPrice', max);
        } else {
            params.delete('maxPrice');
        }

        // Update or delete campus
        if (campusValue) {
            params.set('campus', campusValue);
        } else {
            params.delete('campus');
        }

        // Update or delete sort options
        if (sortValue && sortValue !== 'newest') {
            params.set('sort', sortValue);
        } else {
            params.delete('sort');
        }

        // Reset page back to 1 when filters are adjusted
        params.delete('page');

        const queryString = params.toString();
        startTransition(() => {
            router.replace(`/marketplace${queryString ? `?${queryString}` : ''}`);
        });
    };

    const toggleCategory = (categoryName) => {
        let newCategories;
        if (selectedCategories.includes(categoryName)) {
            newCategories = selectedCategories.filter(c => c !== categoryName);
        } else {
            newCategories = [...selectedCategories, categoryName];
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
        if (isPriceRangeInvalid) return;
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
        closeSidebar();
    };

    const sanitizePrice = (val) => {
        return val.replace(/[^0-9.]/g, '');
    };

    const isPriceRangeInvalid = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);
    
    // Calculate total count of active filter groups
    const activeFilterCountBadge = [
        selectedCategories.length > 0 ? 1 : 0,
        selectedConditions.length > 0 ? 1 : 0,
        minPrice !== '' || maxPrice !== '' ? 1 : 0,
        campus ? 1 : 0,
        sort !== 'newest' ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const hasAnyFilterActive = activeFilterCountBadge > 0;

    const displayedCategories = showAllCategories ? categoryDetails : categoryDetails.slice(0, 4);

    if (!isOpen) return null;

    return (
        /* Overlay Backdrop */
        <div
            className={`fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity duration-300 ${
                animatingOut ? 'opacity-0' : 'animate-fade-in'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort listings"
        >
            <button
                className="absolute inset-0 w-full h-full bg-transparent cursor-default border-none outline-none"
                onClick={closeSidebar}
                aria-label="Close filters overlay"
                tabIndex={-1}
            />

            {/* Modal Body / Bottom Drawer container */}
            <div
                className={`relative w-full max-w-lg bg-white dark:bg-[#1E2227] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border-t sm:border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] overflow-hidden ${
                    animatingOut ? 'translate-y-full transition-transform duration-300 ease-in' : 'animate-slide-up'
                }`}
                onKeyDown={handleKeyDown}
            >
                {/* Visual drag handle indicator for mobile */}
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
                    <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Modal Header */}
                <div className="px-6 pt-3 pb-3 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                            Filter &amp; Sort
                        </h2>
                        {activeFilterCountBadge > 0 && (
                            <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-[#1daddd]/10 text-[#1daddd] dark:bg-[#1daddd]/20 border border-[#1daddd]/20">
                                {activeFilterCountBadge} active
                            </span>
                        )}
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={closeSidebar}
                        aria-label="Close filters"
                        className="size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <DynamicLucideIcon name="close" size={20} />
                    </button>
                </div>

                {/* Scrollable Filters Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 no-scrollbar">

                    {/* 1. Categories Section (Matches /categories card style) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <DynamicLucideIcon name="category" className="text-[#1daddd]" size={18} />
                                <h3 className="font-bold text-sm tracking-tight">Categories</h3>
                                {selectedCategories.length > 0 && (
                                    <span className="text-[11px] font-bold text-[#1daddd]">
                                        ({selectedCategories.length})
                                    </span>
                                )}
                            </div>
                            {selectedCategories.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategories([])}
                                    className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* 2-Column Card Grid matching /categories */}
                        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Filter by category">
                            {displayedCategories.map((category) => {
                                const isSelected = selectedCategories.includes(category.name);
                                return (
                                    <button
                                        key={category.name}
                                        type="button"
                                        onClick={() => toggleCategory(category.name)}
                                        className={`relative overflow-hidden rounded-2xl p-3 h-[104px] flex flex-col justify-between text-left transition-all group active:scale-[0.98] border-2 cursor-pointer ${
                                            isSelected
                                                ? 'border-[#1daddd] bg-[#1daddd]/10 dark:bg-[#1daddd]/20 shadow-sm'
                                                : 'border-transparent bg-[#EEF2F4] dark:bg-[#2A2E33] hover:border-gray-200 dark:hover:border-gray-700'
                                        }`}
                                        aria-pressed={isSelected}
                                    >
                                        <div className="z-10 flex flex-col max-w-[62%]">
                                            <span className={`text-xs font-bold leading-tight line-clamp-1 ${
                                                isSelected ? 'text-[#1daddd] dark:text-[#34bcff]' : 'text-gray-900 dark:text-white'
                                            }`}>
                                                {category.name}
                                            </span>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">
                                                {category.subtitle}
                                            </span>
                                        </div>

                                        {/* Active Selection Checkmark Badge */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 z-20 size-5 rounded-full bg-[#1daddd] text-white flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-150">
                                                <DynamicLucideIcon name="check" size={12} strokeWidth={3} />
                                            </div>
                                        )}

                                        {/* 3D Category Image */}
                                        <div className="absolute -bottom-1 -right-1 w-18 h-18 pointer-events-none">
                                            <Image
                                                src={category.image}
                                                alt={category.name}
                                                width={72}
                                                height={72}
                                                className="object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)] group-hover:scale-105 transition-transform duration-200"
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Collapsible toggle for category grid */}
                        <button
                            type="button"
                            onClick={() => setShowAllCategories(!showAllCategories)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-750 text-xs font-bold text-[#1daddd] hover:bg-[#1daddd]/5 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <span>{showAllCategories ? 'Show fewer categories' : `Show all ${categoryDetails.length} categories`}</span>
                            <DynamicLucideIcon
                                name="expand_more"
                                size={16}
                                className={`transition-transform duration-200 ${showAllCategories ? 'rotate-180' : ''}`}
                            />
                        </button>
                    </div>

                    {/* 2. Sort Options */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                            <DynamicLucideIcon name="sort" className="text-[#1daddd]" size={18} />
                            <h3 className="font-bold text-sm tracking-tight" id="sort-heading">Sort By</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="sort-heading">
                            {sortOptions.map((opt) => {
                                const isSelected = sort === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        onClick={() => setSort(opt.value)}
                                        className={`flex items-center gap-2.5 p-3 rounded-2xl transition-all border text-left active:scale-[0.98] ${
                                            isSelected
                                                ? 'border-[#1daddd] bg-[#1daddd]/10 dark:bg-[#1daddd]/20 text-[#1daddd] shadow-xs'
                                                : 'border-transparent bg-gray-50 dark:bg-[#2A2E33] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#32363C]'
                                        }`}
                                    >
                                        <div className={`flex items-center justify-center size-8 rounded-xl shrink-0 ${
                                            isSelected ? 'bg-[#1daddd] text-white shadow-xs' : 'bg-white dark:bg-[#1E2227] text-gray-400'
                                        }`}>
                                            <DynamicLucideIcon name={opt.icon} size={16} />
                                        </div>
                                        <span className="text-xs font-bold leading-tight">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Price Range Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <DynamicLucideIcon name="payments" className="text-[#1daddd]" size={18} />
                                <h3 className="font-bold text-sm tracking-tight">Price Range</h3>
                            </div>
                            {(minPrice || maxPrice) && (
                                <button
                                    type="button"
                                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                                    className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Quick Presets for student budgets */}
                        <div className="flex flex-wrap gap-2">
                            {pricePresets.map((preset) => {
                                const isPresetActive = minPrice === preset.min && maxPrice === preset.max;
                                return (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => {
                                            if (isPresetActive) {
                                                setMinPrice('');
                                                setMaxPrice('');
                                            } else {
                                                setMinPrice(preset.min);
                                                setMaxPrice(preset.max);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                            isPresetActive
                                                ? 'bg-[#1daddd] text-white border-[#1daddd] shadow-xs'
                                                : 'bg-gray-50 dark:bg-[#2A2E33] text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Min / Max Inputs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                                    Min Price
                                </span>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3.5 text-xs font-black text-gray-400 dark:text-gray-500">
                                        ₵
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(sanitizePrice(e.target.value))}
                                        className="w-full h-11 pl-8 pr-3 bg-gray-50 dark:bg-[#2A2E33] border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#1daddd] focus:ring-1 focus:ring-[#1daddd] transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                                    Max Price
                                </span>
                                <div className="relative flex items-center">
                                    <span className="absolute left-3.5 text-xs font-black text-gray-400 dark:text-gray-500">
                                        ₵
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Any"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(sanitizePrice(e.target.value))}
                                        className="w-full h-11 pl-8 pr-3 bg-gray-50 dark:bg-[#2A2E33] border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#1daddd] focus:ring-1 focus:ring-[#1daddd] transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Validation Error Message */}
                        {isPriceRangeInvalid && (
                            <div className="flex items-center gap-1.5 text-red-500 pl-1">
                                <DynamicLucideIcon name="error" size={14} />
                                <p className="text-xs font-bold tracking-tight">
                                    Min price cannot exceed Max price
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 4. Condition Filters */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <DynamicLucideIcon name="verified" className="text-[#1daddd]" size={18} />
                                <h3 className="font-bold text-sm tracking-tight" id="condition-heading">Condition</h3>
                                {selectedConditions.length > 0 && (
                                    <span className="text-[11px] font-bold text-[#1daddd]">
                                        ({selectedConditions.length})
                                    </span>
                                )}
                            </div>
                            {selectedConditions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedConditions([])}
                                    className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="condition-heading">
                            {conditions.map((con) => {
                                const isSelected = selectedConditions.includes(con);
                                return (
                                    <button
                                        key={con}
                                        type="button"
                                        onClick={() => toggleCondition(con)}
                                        aria-pressed={isSelected}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border active:scale-[0.98] ${
                                            isSelected
                                                ? 'bg-[#1daddd] text-white border-[#1daddd] shadow-xs'
                                                : 'bg-gray-50 dark:bg-[#2A2E33] text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <DynamicLucideIcon
                                            name={con === 'New' ? 'new_releases' : con === 'Like New' ? 'thumb_up' : con === 'Good' ? 'handshake' : con === 'Fair' ? 'rule' : 'build'}
                                            size={15}
                                        />
                                        {con}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. Campus Location Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                <DynamicLucideIcon name="near_me" className="text-[#1daddd]" size={18} />
                                <h3 className="font-bold text-sm tracking-tight">Campus</h3>
                            </div>
                            {campus && (
                                <button
                                    type="button"
                                    onClick={() => setCampus('')}
                                    className="text-[11px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Popular Campus Quick Pills */}
                        <div className="flex flex-wrap gap-2">
                            {popularCampuses.map((camp) => {
                                const isSelected = campus.toLowerCase() === camp.name.toLowerCase() || campus.toLowerCase() === camp.short.toLowerCase();
                                return (
                                    <button
                                        key={camp.short}
                                        type="button"
                                        onClick={() => {
                                            if (isSelected) {
                                                setCampus('');
                                            } else {
                                                setCampus(camp.name);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                            isSelected
                                                ? 'bg-[#1daddd] text-white border-[#1daddd] shadow-xs'
                                                : 'bg-gray-50 dark:bg-[#2A2E33] text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        {camp.short}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Campus Input */}
                        <div className="relative flex items-center">
                            <DynamicLucideIcon
                                name="location_on"
                                size={18}
                                className="absolute left-3.5 text-gray-400 dark:text-gray-500 pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Search or enter campus name..."
                                value={campus}
                                onChange={(e) => setCampus(e.target.value)}
                                className="w-full h-11 pl-10 pr-9 bg-gray-50 dark:bg-[#2A2E33] border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#1daddd] focus:ring-1 focus:ring-[#1daddd] transition-all placeholder:text-gray-400"
                            />
                            {campus && (
                                <button
                                    type="button"
                                    onClick={() => setCampus('')}
                                    className="absolute right-3 size-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                >
                                    <DynamicLucideIcon name="close" size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sticky Footer CTA */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/80 bg-white/95 dark:bg-[#1E2227]/95 backdrop-blur-lg flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!hasAnyFilterActive}
                        className="h-12 px-5 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        Reset
                    </button>
                    <button
                        ref={lastFocusableRef}
                        type="button"
                        onClick={handleApply}
                        disabled={isPending || isPriceRangeInvalid}
                        className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-all shadow-lg active:scale-95 ${
                            isPriceRangeInvalid
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                                : 'bg-[#1daddd] hover:bg-[#159ac6] shadow-[#1daddd]/25'
                        }`}
                    >
                        {isPending ? (
                            <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        ) : (
                            <>
                                <span>Apply Filters</span>
                                {activeFilterCountBadge > 0 && (
                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white text-[#1daddd] text-[11px] font-black leading-none shadow-xs">
                                        {activeFilterCountBadge}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}