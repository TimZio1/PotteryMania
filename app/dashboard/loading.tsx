import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-4 py-8 sm:px-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <SkeletonText className="mt-4" lines={2} />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm">
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
