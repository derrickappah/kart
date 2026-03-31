'use client';
import { useSearchParams } from 'next/navigation';

export default function MarketplaceControls() {
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

            </div>
        </div>
    );
}
