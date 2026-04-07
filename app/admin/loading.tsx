import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-3 h-8 w-56" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <SkeletonText lines={6} />
      </div>
    </div>
  );
}
