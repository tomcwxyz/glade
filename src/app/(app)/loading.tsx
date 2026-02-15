export default function AppLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-12">
        <div className="h-8 w-48 bg-paper-deep rounded-lg mb-3" />
        <div className="h-4 w-72 bg-paper-deep rounded" />
      </div>

      {/* Stats strip */}
      <div className="flex gap-12 mb-14 pb-8 border-b border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div className="h-8 w-12 bg-paper-deep rounded mb-1" />
            <div className="h-3 w-24 bg-paper-deep rounded" />
          </div>
        ))}
      </div>

      {/* Content blocks */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="w-10 h-10 bg-paper-deep rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-paper-deep rounded" />
              <div className="h-3 w-1/2 bg-paper-deep rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
