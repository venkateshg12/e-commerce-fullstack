import { Skeleton } from "@/components/ui/skeleton";

// Shown while a lazily loaded page's code downloads — grey blocks, never a blank screen.
const RouteFallback = () => (
  <div className="route-fallback" aria-busy="true" aria-label="Loading page">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={`route-fallback-${index}`} className="aspect-3/4 w-full" />
      ))}
    </div>
  </div>
);

export default RouteFallback;
