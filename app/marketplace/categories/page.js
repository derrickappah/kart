'use client';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';
import Link from 'next/link';

/**
 * Categories must exactly match those used in FilterSidebar.js so that
 * clicking a category on this page produces real results in the marketplace.
 *
 * Icon mapping uses Material Symbols names (via DynamicLucideIcon) for
 * consistency with the rest of the app.
 */
const categories = [
    { name: 'Textbooks',          icon: 'menu_book',           color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400' },
    { name: 'Electronics',        icon: 'devices',              color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' },
    { name: 'Dorm Furniture',     icon: 'chair',                color: 'bg-lime-500/10 text-lime-700 border-lime-500/20 dark:text-lime-400' },
    { name: 'Clothing',           icon: 'checkroom',            color: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:text-pink-400' },
    { name: 'School Supplies',    icon: 'school',               color: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400' },
    { name: 'Tickets & Events',   icon: 'confirmation_number',  color: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400' },
    { name: 'Services & Tutoring',icon: 'support_agent',        color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
    { name: 'Beauty & Grooming',  icon: 'face_retouching_natural', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400' },
    { name: 'Sports & Fitness',   icon: 'sports_soccer',        color: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' },
    { name: 'Kitchenware',        icon: 'kitchen',              color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
    { name: 'Musical Instruments',icon: 'piano',                color: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400' },
    { name: 'Games & Consoles',   icon: 'sports_esports',       color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400' },
    { name: 'Health & Wellness',  icon: 'favorite',             color: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400' },
    { name: 'Arts & Crafts',      icon: 'palette',              color: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-400' },
    { name: 'Home Appliances',    icon: 'home_iot_device',      color: 'bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400' },
];

export default function CategoriesPage() {
    return (
        <div className="bg-white dark:bg-[#242428] min-h-screen font-display antialiased">
            <div className="max-w-md mx-auto min-h-screen px-6 py-12 flex flex-col gap-10">
                <header className="space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Browse by Category
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Find exactly what you&apos;re looking for on campus
                    </p>
                </header>

                <main>
                    <ul className="grid grid-cols-2 gap-4 list-none p-0 m-0" aria-label="Product categories">
                        {categories.map((category) => (
                            <li key={category.name}>
                                <Link
                                    href={`/marketplace?category=${encodeURIComponent(category.name)}`}
                                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl border-2 ${category.color} shadow-soft hover:shadow-md transition-all active:scale-[0.97] group w-full`}
                                    aria-label={`Browse ${category.name}`}
                                >
                                    <DynamicLucideIcon
                                        name={category.icon}
                                        className="text-4xl group-hover:scale-110 transition-transform duration-300"
                                        aria-hidden="true"
                                    />
                                    <span className="text-xs font-black uppercase tracking-widest text-center leading-tight">
                                        {category.name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </main>

                <div className="mt-auto py-8">
                    <Link
                        href="/marketplace"
                        className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest border-2 border-primary/10 rounded-2xl h-14 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <DynamicLucideIcon name="shopping_basket" className="text-[18px]" aria-hidden="true" />
                        Go to Marketplace
                    </Link>
                </div>
            </div>
        </div>
    );
}
