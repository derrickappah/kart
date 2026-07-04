'use client';

import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function SearchInput({ placeholder, showFilter, leftContent, hideFilter, value, onChange, onSubmit, onClear }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchVal = searchParams.get('search') || '';
    
    const isControlled = value !== undefined && onChange !== undefined;
    const [localQuery, setLocalQuery] = useState(searchVal);
    const query = isControlled ? value : localQuery;

    const [prevSearch, setPrevSearch] = useState(searchVal);
    const [isPending, startTransition] = useTransition();
    const [isExpanded, setIsExpanded] = useState(isControlled ? !!value : !!searchVal);
    const [isAnimating, setIsAnimating] = useState(false);

    // Sync input value with external URL changes (e.g. back button, clears)
    if (!isControlled && searchVal !== prevSearch) {
        setPrevSearch(searchVal);
        setLocalQuery(searchVal);
        if (searchVal) {
            setIsExpanded(true);
        }
    }

    // Form submit handlers
    const handleSearch = (e) => {
        e.preventDefault();
        if (onSubmit) {
            onSubmit(query);
            return;
        }
        const next = new URLSearchParams(searchParams.toString());
        const trimmed = query.trim();
        if (trimmed) {
            next.set('search', trimmed);
        } else {
            next.delete('search');
        }
        const queryString = next.toString();
        startTransition(() => {
            router.push(`/marketplace${queryString ? `?${queryString}` : ''}`);
        });
    };

    const handleClear = () => {
        if (isControlled) {
            onChange('');
        } else {
            setLocalQuery('');
        }
        if (onClear) {
            onClear();
            return;
        }
        const next = new URLSearchParams(searchParams.toString());
        next.delete('search');
        const queryString = next.toString();
        startTransition(() => {
            router.push(`/marketplace${queryString ? `?${queryString}` : ''}`);
        });
    };

    // Calculate count of active filters for badge notification
    const activeFilterCount = [
        searchParams.get('category'),
        searchParams.get('condition'),
        searchParams.get('minPrice') || searchParams.get('maxPrice'),
        searchParams.get('campus'),
        searchParams.get('sort') && searchParams.get('sort') !== 'newest' ? 'sort' : null,
    ].filter(Boolean).length;

    const handleOpenFilters = () => {
        window.dispatchEvent(new CustomEvent('open-filters'));
    };

    const showHighlight = isExpanded && isAnimating;

    // Header layout with complex transitions for expanded/collapsed states
    if (showFilter) {
        return (
            <div className="relative flex items-center justify-between w-full h-14 px-1 overflow-hidden">
                
                {/* 1. Left Content (Logo or Category Chips): Vanishes smoothly on expand, restores smoothly on collapse */}
                <div
                    className={`absolute left-1 flex items-center transition-all [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] transform origin-left w-full ${
                        isExpanded 
                            ? 'opacity-0 -translate-x-4 max-w-0 overflow-hidden pointer-events-none duration-[600ms]' 
                            : leftContent 
                                ? hideFilter
                                    ? 'opacity-100 translate-x-0 max-w-[calc(100%-60px)] duration-[200ms]'
                                    : 'opacity-100 translate-x-0 max-w-[calc(100%-120px)] duration-[200ms]'
                                : 'opacity-100 translate-x-0 max-w-[80px] duration-[200ms]'
                    }`}
                >
                    {leftContent || (
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logo.png"
                                alt="KART Logo"
                                width={80}
                                height={32}
                                priority
                            />
                        </Link>
                    )}
                </div>

                {/* 2. Search Container (Input Wrapper): Animates from collapsed button to full-width text container */}
                <form
                    onSubmit={handleSearch}
                    onClick={() => {
                        if (!isExpanded) {
                            setIsExpanded(true);
                            setIsAnimating(true);
                            setTimeout(() => {
                                setIsAnimating(false);
                            }, 900);
                        }
                    }}
                    role="search"
                    aria-label="Search marketplace listings"
                    className={`absolute border [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${
                        isExpanded 
                            ? `flex items-center left-1 right-20 h-11 bg-gray-50 dark:bg-[#2d2d32] rounded-2xl px-4 shadow-soft cursor-text transition-all duration-[900ms] ${
                                showHighlight 
                                    ? 'ring-2 ring-primary border-transparent' 
                                    : 'ring-0 border-gray-200 dark:border-gray-700'
                              }`
                            : hideFilter
                                ? 'flex items-center left-[calc(100%-48px)] right-1 w-11 h-11 bg-gray-50 dark:bg-[#2d2d32] border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#38383e] cursor-pointer transition-all duration-[200ms]'
                                : 'flex items-center left-[calc(100%-100px)] right-[56px] w-11 h-11 bg-gray-50 dark:bg-[#2d2d32] border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#38383e] cursor-pointer transition-all duration-[200ms]'
                    }`}
                >
                    {/* Centered Input element with symmetric clearance padding */}
                    <input
                        type="text"
                        inputMode="search"
                        className={`w-full bg-transparent text-sm font-bold text-gray-900 placeholder-gray-400 dark:text-white border-none p-0 text-left pl-7 pr-10 transition-all outline-none focus:outline-none focus:ring-0 focus:ring-transparent focus:border-transparent focus-visible:outline-none focus-visible:ring-0 shadow-none focus:shadow-none ${
                            isExpanded 
                                ? 'opacity-100 pointer-events-auto duration-500 delay-[400ms]' 
                                : 'opacity-0 pointer-events-none duration-[100ms]'
                        }`}
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => isControlled ? onChange(e.target.value) : setLocalQuery(e.target.value)}
                        aria-label="Search listings"
                        autoComplete="off"
                        maxLength={200}
                        disabled={!isExpanded}
                        ref={(input) => {
                            if (input && isExpanded && document.activeElement !== input && !query) {
                                input.focus();
                            }
                        }}
                    />

                    {/* Single clear/close button inside input bounds */}
                    {query && isExpanded && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full shrink-0"
                        >
                            <DynamicLucideIcon name="close" size={16} aria-hidden="true" />
                        </button>
                    )}
                </form>

                {/* 3. Sliding Search Icon: Translates independently to match speed and curves */}
                <button
                    type="button"
                    onClick={() => {
                        if (!isExpanded) {
                            setIsExpanded(true);
                            setIsAnimating(true);
                            setTimeout(() => {
                                setIsAnimating(false);
                            }, 900);
                        }
                    }}
                    className={`absolute h-11 flex items-center justify-center [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] z-20 ${
                        isExpanded 
                            ? 'left-5 w-5 pointer-events-none text-primary transition-all duration-[900ms]' 
                            : hideFilter
                                ? 'left-[calc(100%-36px)] w-5 text-primary cursor-pointer transition-all duration-[200ms]'
                                : 'left-[calc(100%-88px)] w-5 text-primary cursor-pointer transition-all duration-[200ms]'
                    }`}
                >
                    <DynamicLucideIcon name="search" size={20} aria-hidden="true" />
                </button>

                {/* 4. Cancel Button: Staggered slide-in during expansion, instant disappear during collapse */}
                <div
                    className={`absolute right-1 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                        isExpanded 
                            ? 'max-w-[70px] opacity-100 translate-x-0 transition-all duration-[900ms]' 
                            : 'max-w-0 opacity-0 translate-x-4 pointer-events-none transition-all duration-[150ms]'
                    }`}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                            setIsAnimating(false);
                            if (searchVal) {
                                handleClear();
                            }
                        }}
                        className="text-sm font-black text-primary hover:text-primary/80 transition-colors whitespace-nowrap h-11 flex items-center"
                    >
                        Cancel
                    </button>
                </div>

                {/* 5. Filter Icon Button: Fades out smoothly on expand, returns snappy on collapse */}
                {!hideFilter && (
                    <div
                        className={`absolute right-1 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                            isExpanded 
                                ? 'max-w-0 opacity-0 scale-90 translate-x-4 pointer-events-none transition-all duration-[900ms]' 
                                : 'max-w-[52px] opacity-100 scale-100 translate-x-0 transition-all duration-[200ms]'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            aria-label={
                                activeFilterCount > 0
                                    ? `Filter & Sort — ${activeFilterCount} filters active`
                                    : 'Filter & Sort'
                            }
                            className="size-11 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-[#2d2d32] border border-gray-100 dark:border-gray-800 text-primary hover:bg-gray-100 dark:hover:bg-[#38383e] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative shrink-0"
                        >
                            <DynamicLucideIcon name="tune" size={20} aria-hidden="true" />
                            {activeFilterCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border border-white dark:border-[#242428] shadow-sm leading-none"
                                    aria-hidden="true"
                                >
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Default standalone inline SearchBar form (used in main page hero/lists)
    return (
        <form
            className="group flex w-full items-center rounded-2xl bg-white dark:bg-surface-dark px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-primary border border-gray-200 dark:border-gray-700 shadow-soft"
            onSubmit={handleSearch}
            role="search"
            aria-label="Search marketplace listings"
        >
            <DynamicLucideIcon
                name="search"
                size={24}
                className={`text-[24px] font-bold transition-colors ${isPending ? 'text-gray-400' : 'text-primary'}`}
                aria-hidden="true"
            />
            <input
                type="search"
                className="ml-3 flex-1 bg-transparent text-base font-semibold text-gray-900 placeholder-gray-500 focus:outline-none dark:text-white dark:placeholder-gray-400 border-none p-0 focus:ring-0"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search listings"
                autoComplete="off"
                maxLength={200}
            />
            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="ml-2 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                >
                    <DynamicLucideIcon name="close" size={18} className="text-[18px]" aria-hidden="true" />
                </button>
            )}
        </form>
    );
}

export default function SearchBar({ placeholder = 'Search...', showFilter = false, leftContent, hideFilter = false, value, onChange, onSubmit, onClear }) {
    return (
        <Suspense fallback={
            <div className="flex w-full items-center justify-between h-12 bg-gray-100 dark:bg-[#2d2d32] px-4 rounded-2xl">
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
            </div>
        }>
            <SearchInput
                placeholder={placeholder}
                showFilter={showFilter}
                leftContent={leftContent}
                hideFilter={hideFilter}
                value={value}
                onChange={onChange}
                onSubmit={onSubmit}
                onClear={onClear}
            />
        </Suspense>
    );
}
