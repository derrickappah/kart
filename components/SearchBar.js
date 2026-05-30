'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useState, useEffect, Suspense, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchInput({ placeholder }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchVal = searchParams.get('search') || '';
    const [query, setQuery] = useState(searchVal);
    const [prevSearch, setPrevSearch] = useState(searchVal);
    const [isPending, startTransition] = useTransition();

    if (searchVal !== prevSearch) {
        setPrevSearch(searchVal);
        setQuery(searchVal);
    }

    const handleSearch = (e) => {
        e.preventDefault();
        const targetUrl = query.trim() 
            ? `/marketplace?search=${encodeURIComponent(query)}` 
            : '/marketplace';
            
        startTransition(() => {
            router.push(targetUrl);
        });
    };

    return (
        <form className="group flex w-full items-center rounded-2xl bg-white dark:bg-surface-dark px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-primary border border-gray-200 dark:border-gray-700 shadow-soft" onSubmit={handleSearch}>
            <DynamicLucideIcon name="search" className="text-primary dark:text-primary text-[24px] font-bold" />
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
