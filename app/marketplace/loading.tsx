import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-4">
              <SkeletonText lines={2} />
              <Skeleton className="mt-3 h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
