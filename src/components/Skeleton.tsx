/** A shimmering placeholder block for loading states. Sizes via className (h-*, w-*). */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gradient-to-r from-card via-secondary to-card bg-[length:200%_100%] ${className}`}
      style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
    />
  );
}

/** A skeleton shaped like a standard content card, for list/grid loading states. */
export function SkeletonCard() {
  return (
    <div className="glass edge-light rounded-2xl border border-border p-4">
      <Skeleton className="h-9 w-9" />
      <Skeleton className="mt-3 h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
