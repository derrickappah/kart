'use client';
import Link from 'next/link';

const categories = [
  { id: 'electronics', name: 'Electronics', icon: '📱', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'fashion', name: 'Fashion', icon: '👕', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'food', name: 'Food', icon: '🍔', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'services', name: 'Services', icon: '🔧', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { id: 'books', name: 'Books', icon: '📚', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'accommodation', name: 'Accommodation', icon: '🏠', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { id: 'textbooks', name: 'Textbooks', icon: '📖', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { id: 'furniture', name: 'Furniture', icon: '🪑', color: 'bg-lime-500/10 text-lime-500 border-lime-500/20' },
  { id: 'other', name: 'Others', icon: '📦', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
];

export default function CategoriesPage() {
  return (
    <div className="bg-white dark:bg-[#131d1f] min-h-screen font-display antialiased">
      <div className="max-w-md mx-auto min-h-screen px-6 py-12 flex flex-col gap-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Browse by Category</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Find exactly what you're looking for on campus</p>
        </header>

        <main className="grid grid-cols-2 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/marketplace?category=${category.name}`}
              className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border ${category.color} shadow-soft hover:shadow-md transition-all active:scale-[0.97] group`}
            >
              <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                {category.icon}
              </div>
              <h3 className="text-xs font-black uppercase tracking-widest text-center">
                {category.name}
              </h3>
            </Link>
          ))}
        </main>

        <div className="mt-auto py-8">
            <Link href="/marketplace" className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest border-2 border-primary/10 rounded-2xl h-14 hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
                Go to Marketplace
            </Link>
        </div>
      </div>
    </div>
  );
}
