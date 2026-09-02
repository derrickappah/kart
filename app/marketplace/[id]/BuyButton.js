'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';

export default function BuyButton({ product }) {
    return (
        <Link
            href={product?.seller_id ? `/profile/${product.seller_id}` : '#'}
            className="flex-1 h-14 rounded-full bg-primary hover:bg-primary-dark text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all whitespace-nowrap px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="View seller profile"
        >
            <DynamicLucideIcon name="person" size={20} aria-hidden="true" />
            <span>Seller Profile</span>
        </Link>
    );
}
