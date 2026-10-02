/** A reduced-motion-safe placeholder block for loading states. */
export function Skeleton({ className = "", label = "Loading" }: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`skeleton-surface rounded-xl ${className}`}
    />
  );
}

/** A skeleton shaped like a standard content card, for list/grid loading states. */
export function SkeletonCard() {
  return (
    <div className="material-l1 rounded-[var(--radius-surface)] border p-4" aria-label="Loading build">
      <Skeleton className="h-9 w-9" />
      <Skeleton className="mt-3 h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
