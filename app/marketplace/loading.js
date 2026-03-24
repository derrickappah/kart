export default function Loading() {
  return (
    <div className="bg-white dark:bg-[#242428] min-h-screen font-display pb-24 animate-pulse">
      <div className="max-w-md mx-auto px-4 pt-20 shadow-2xl bg-white dark:bg-[#242428] min-h-screen">
        {/* Search bar skeleton */}
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4" />
        {/* Controls skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-9 w-28 bg-gray-100 dark:bg-gray-800 rounded-full" />
          <div className="h-9 w-9 bg-gray-100 dark:bg-gray-800 rounded-full" />
        </div>
        {/* 2-col product grid */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-xl" />
              <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-3.5 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
