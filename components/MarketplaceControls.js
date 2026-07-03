'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { useSearchParams } from 'next/navigation';

/**
 * MarketplaceControls — renders the "Filter & Sort" button with a live badge
 * showing how many filter groups are currently active so users know filters are applied.
 */
export default function MarketplaceControls() {
    const searchParams = useSearchParams();

    // Count distinct active filter groups (not individual values)
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

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn-primary px-6 transition-all active:scale-95 relative"
                        onClick={handleOpenFilters}
                        aria-label={
                            activeFilterCount > 0
                                ? `Filter & Sort — ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`
                                : 'Filter & Sort'
                        }
                    >
                        <DynamicLucideIcon name="tune" className="text-[20px]" aria-hidden="true" />
                        Filter &amp; Sort
                        {activeFilterCount > 0 && (
                            <span
                                className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-white text-primary text-[11px] font-black rounded-full flex items-center justify-center border border-primary/20 shadow-sm leading-none"
                                aria-hidden="true"
                            >
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
