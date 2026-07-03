'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchInput({ placeholder }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchVal = searchParams.get('search') || '';
    const [query, setQuery] = useState(searchVal);
    const [prevSearch, setPrevSearch] = useState(searchVal);
    const [isPending, startTransition] = useTransition();

    // Sync local state when the URL search param changes externally
    if (searchVal !== prevSearch) {
        setPrevSearch(searchVal);
        setQuery(searchVal);
    }

    const handleSearch = (e) => {
        e.preventDefault();

        // Preserve existing filter params (category, condition, price, campus, sort)
        // so searching doesn't destroy the user's active filter context.
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
            {/* Clear button — only visible when there is a query */}
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

export default function SearchBar({ placeholder = 'Search...' }) {
    return (
        <Suspense fallback={
            <div className="flex w-full items-center rounded-2xl bg-gray-100 dark:bg-[#2d2d32] px-4 py-3.5">
                <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </div>
        }>
            <SearchInput placeholder={placeholder} />
        </Suspense>
    );
}
