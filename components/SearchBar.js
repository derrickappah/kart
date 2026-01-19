'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchInput({ placeholder }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [query, setQuery] = useState('');

    useEffect(() => {
        // Sync local state with URL param on mount and update
        const search = searchParams.get('search');
        if (search) {
            setQuery(search);
        } else {
            // If navigating away or clearing, we might want to clear or keep.
            // Usually keeping it simple: if URL has search, show it.
            setQuery('');
        }
    }, [searchParams]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/marketplace?search=${encodeURIComponent(query)}`);
        } else {
            router.push('/marketplace');
        }
    };

    return (
        <form className="group flex w-full items-center rounded-2xl bg-white dark:bg-surface-dark px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-primary border border-gray-200 dark:border-gray-700 shadow-soft" onSubmit={handleSearch}>
            <span className="material-symbols-outlined text-primary dark:text-primary text-[24px] font-bold">search</span>
            <input
                type="text"
                className="ml-3 flex-1 bg-transparent text-base font-semibold text-gray-900 placeholder-gray-500 focus:outline-none dark:text-white dark:placeholder-gray-400 border-none p-0 focus:ring-0"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </form>
    );
}

export default function SearchBar({ placeholder = "Search..." }) {
    return (
        <Suspense fallback={<div className="flex w-full items-center rounded-2xl bg-gray-100 dark:bg-[#2d2d32] px-4 py-3.5"><div className="h-5 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div></div>}>
            <SearchInput placeholder={placeholder} />
        </Suspense>
    );
}
