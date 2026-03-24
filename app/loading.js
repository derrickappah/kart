export default function Loading() {
  return (
    <div className="bg-white dark:bg-[#242428] min-h-screen max-w-md mx-auto px-5 pt-6 pb-24 animate-pulse">
      {/* Banner skeleton */}
      <div className="w-full h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4" />

      {/* Search bar skeleton */}
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4" />

      {/* Category chips skeleton */}
      <div className="flex gap-3 overflow-hidden mb-6">
        {[80, 110, 90, 130, 95].map((w, i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-full shrink-0" style={{ width: w }} />
        ))}
      </div>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 w-40 bg-gray-100 dark:bg-gray-800 rounded-full" />
        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Horizontal featured cards */}
      <div className="flex gap-4 overflow-hidden mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="min-w-[280px] flex flex-col rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800">
            <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 w-48 bg-gray-100 dark:bg-gray-800 rounded-full" />
        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Vertical recommended cards */}
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800">
            <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-700" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
