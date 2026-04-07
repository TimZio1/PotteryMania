import { Skeleton } from "@/components/ui/skeleton";

export default function WearShopLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-64" />
      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
