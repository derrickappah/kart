'use client';
import { useSearchParams } from 'next/navigation';

export default function MarketplaceControls({ resultCount }) {
    const searchParams = useSearchParams();
    
    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button 
                        className="btn-primary px-6 transition-all active:scale-95"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-filters'))}
                    >
                        <span className="material-symbols-outlined text-[20px]">tune</span>
                        Filter & Sort
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Found</p>
                    <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{resultCount} items</p>
                </div>
            </div>
        </div>
    );
}
