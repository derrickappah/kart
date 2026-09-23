'use client';

import Image from 'next/image';
import Link from 'next/link';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import { categoryDetails } from '@/utils/categories';

export default function CategoriesPage() {
    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <div className="max-w-md mx-auto min-h-screen px-5 py-6 pb-24 flex flex-col gap-6">
                <header className="space-y-1.5 pt-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        Browse categories
                    </h1>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                        Find exactly what you&apos;re looking for on campus
                    </p>
                </header>

                <main>
                    <ul className="grid grid-cols-2 gap-3 list-none p-0 m-0" aria-label="Product categories">
                        {categoryDetails.map((category) => (
                            <li key={category.name}>
                                <Link
                                    href={`/marketplace?category=${encodeURIComponent(category.name)}`}
                                    className="relative overflow-hidden rounded-2xl bg-[#EEF2F4] dark:bg-[#2A2E33] border border-gray-100/80 dark:border-gray-800/60 p-3.5 h-[116px] sm:h-32 flex flex-col justify-between group active:scale-[0.98] transition-all block w-full"
                                    aria-label={`Browse ${category.name}`}
                                >
                                    <div className="z-10 flex flex-col max-w-[62%]">
                                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                                            {category.name}
                                        </h2>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug line-clamp-2">
                                            {category.subtitle}
                                        </p>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-20 h-20 sm:w-24 sm:h-24 pointer-events-none">
                                        <Image
                                            src={category.image}
                                            alt={category.name}
                                            fill
                                            className="object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.12)] group-hover:scale-105 transition-transform duration-300"
                                            sizes="(max-width: 768px) 100px, 120px"
                                        />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </main>

                <div className="pt-2">
                    <Link
                        href="/marketplace"
                        className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-wider border-2 border-primary/20 rounded-2xl h-12 hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="shopping_bag" size={16} aria-hidden="true" />
                        Go to Marketplace
                    </Link>
                </div>
            </div>
        </div>
    );
}
