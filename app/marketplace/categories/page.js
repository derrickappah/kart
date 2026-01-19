import Link from 'next/link';

const categories = [
  { id: 'electronics', name: 'Electronics', icon: '📱', color: '#3b82f6' },
  { id: 'fashion', name: 'Fashion', icon: '👕', color: '#ec4899' },
  { id: 'food', name: 'Food', icon: '🍔', color: '#f59e0b' },
  { id: 'services', name: 'Services', icon: '🔧', color: '#10b981' },
  { id: 'books', name: 'Books', icon: '📚', color: '#8b5cf6' },
  { id: 'accommodation', name: 'Accommodation', icon: '🏠', color: '#ef4444' },
  { id: 'textbooks', name: 'Textbooks', icon: '📖', color: '#06b6d4' },
  { id: 'furniture', name: 'Furniture', icon: '🪑', color: '#84cc16' },
  { id: 'other', name: 'Others', icon: '📦', color: '#64748b' },
];

export default function CategoriesPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>Browse by Category</h1>
        <p className={styles.subtitle}>Find exactly what you're looking for</p>
      </header>

      <div className={styles.grid}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/marketplace?category=${category.name}`}
            className={styles.categoryCard}
            style={{ '--category-color': category.color }}
          >
            <div className={styles.icon}>{category.icon}</div>
            <h3 className={styles.name}>{category.name}</h3>
          </Link>
        ))}
      </div>
    </main>
  );
}
