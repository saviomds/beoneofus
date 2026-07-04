"use client";

import { cn } from "./lib";

// Shimmer skeleton primitive.
export function Skeleton({ className = "" }) {
  return <div className={cn("relative overflow-hidden rounded-lg bg-mkt-card-2 mkt-shimmer", className)} />;
}

// Product-card shaped skeleton, matches ProductCard layout to avoid layout shift.
export function ProductCardSkeleton() {
  return (
    <div className="rounded-mkt border border-mkt-border bg-mkt-card p-3">
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <div className="mt-3 space-y-2 p-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// A grid of card skeletons for initial marketplace load.
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}
