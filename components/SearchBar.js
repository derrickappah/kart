'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function SearchInput({ placeholder, showFilter }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchVal = searchParams.get('search') || '';
    const [query, setQuery] = useState(searchVal);
    const [prevSearch, setPrevSearch] = useState(searchVal);
    const [isPending, startTransition] = useTransition();

    // If there is an active search query in URL, start expanded
    const [isExpanded, setIsExpanded] = useState(!!searchVal);

    // Sync local state when the URL search param changes externally
    if (searchVal !== prevSearch) {
        setPrevSearch(searchVal);
        setQuery(searchVal);
        if (searchVal) {
            setIsExpanded(true);
        }
    }

    const handleSearch = (e) => {
        e.preventDefault();
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
        setQuery('');
        const next = new URLSearchParams(searchParams.toString());
        next.delete('search');
        const queryString = next.toString();
        startTransition(() => {
            router.push(`/marketplace${queryString ? `?${queryString}` : ''}`);
        });
    };

    // Calculate active filters to display in the badge
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

    if (showFilter) {
        return (
            <div className="relative flex items-center justify-between w-full h-14 px-1 overflow-hidden">
                {/* App Logo (fades/slides left when search expands) */}
                <Link
                    href="/"
                    className={`absolute left-1 flex items-center transition-all [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] transform origin-left ${
                        isExpanded 
                            ? 'opacity-0 -translate-x-4 max-w-0 overflow-hidden pointer-events-none duration-0' 
                            : 'opacity-100 translate-x-0 max-w-[80px] duration-[200ms]'
                    }`}
                >
                    <Image
                        src="/logo.png"
                        alt="KART Logo"
                        width={80}
                        height={32}
                        priority
                    />
                </Link>

                {/* Combined Search Button / Form */}
                <form
                    onSubmit={handleSearch}
                    onClick={() => {
                        if (!isExpanded) {
                            setIsExpanded(true);
                        }
                    }}
                    role="search"
                    aria-label="Search marketplace listings"
                    className={`absolute border [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] ${
                        isExpanded 
                            ? 'left-1 right-20 h-11 bg-gray-50 dark:bg-[#2d2d32] border-gray-200 dark:border-gray-700 rounded-2xl px-4 shadow-soft focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent cursor-text transition-all duration-[900ms] delay-[300ms]' 
                            : 'right-[56px] w-11 h-11 bg-gray-50 dark:bg-[#2d2d32] border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-[#38383e] cursor-pointer transition-all duration-[200ms]'
                    }`}
                >
                    <input
                        type="search"
                        className={`w-full bg-transparent text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white border-none p-0 focus:ring-0 pl-7 ${
                            isExpanded 
                                ? 'opacity-100 translate-x-0 transition-all duration-500 delay-[400ms]' 
                                : 'opacity-0 translate-x-2 pointer-events-none w-0 overflow-hidden transition-all duration-[100ms]'
                        }`}
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
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

                {/* Sliding Search Icon (direct child of header for independent, non-delayed translation) */}
                <button
                    type="button"
                    onClick={() => {
                        if (!isExpanded) {
                            setIsExpanded(true);
                        }
                    }}
                    className={`absolute h-11 flex items-center justify-center [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] z-20 ${
                        isExpanded 
                            ? 'left-5 w-5 pointer-events-none text-primary transition-all duration-[600ms]' 
                            : 'left-[calc(100%-88px)] w-5 text-primary cursor-pointer transition-all duration-[200ms]'
                    }`}
                >
                    <DynamicLucideIcon name="search" size={20} aria-hidden="true" />
                </button>

                {/* Cancel Button (only shown when expanded) */}
                <div
                    className={`absolute right-1 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                        isExpanded ? 'max-w-[70px] opacity-100 translate-x-0 transition-all duration-[1200ms] delay-[300ms]' : 'max-w-0 opacity-0 translate-x-4 pointer-events-none transition-all duration-[150ms]'
                    }`}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                            if (searchVal) {
                                handleClear();
                            }
                        }}
                        className="text-sm font-black text-primary hover:text-primary/80 transition-colors whitespace-nowrap h-11 flex items-center"
                    >
                        Cancel
                    </button>
                </div>

                {/* Filter Icon Button (only shown when collapsed) */}
                <div
                    className={`absolute right-1 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                        isExpanded ? 'max-w-0 opacity-0 scale-90 translate-x-4 pointer-events-none transition-all duration-[1200ms]' : 'max-w-[52px] opacity-100 scale-100 translate-x-0 transition-all duration-[200ms]'
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
            </div>
        );
    }

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

export default function SearchBar({ placeholder = 'Search...', showFilter = false }) {
    return (
        <Suspense fallback={
            <div className="flex w-full items-center justify-between h-12 bg-gray-100 dark:bg-[#2d2d32] px-4 rounded-2xl">
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
            </div>
        }>
            <SearchInput placeholder={placeholder} showFilter={showFilter} />
        </Suspense>
    );
}
