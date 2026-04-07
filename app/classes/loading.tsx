import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function ClassesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <Skeleton className="h-5 w-28" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
            <Skeleton className="h-40 w-full rounded-xl" />
            <SkeletonText className="mt-4" lines={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
