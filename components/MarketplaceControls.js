'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FilterSidebar from './FilterSidebar';

const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
];

export default function MarketplaceControls({ resultCount }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showFilters, setShowFilters] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    
    // Get current sort from URL or default to 'newest'
    const currentSort = searchParams?.get('sort') || 'newest';
    const sortValue = sortOptions.find(opt => opt.value === currentSort)?.label || 'Newest First';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSortMenu && !event.target.closest('.sortContainer')) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSortMenu]);

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button 
                        className="btn-primary"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-filters'))}
                    >
                        <span className="material-symbols-outlined text-[20px]">tune</span>
                        Filter & Sort
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Found</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{resultCount} items</p>
                </div>
            </div>
        </div>
    );
}
