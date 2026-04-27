import { Skeleton } from "@/components/ui/skeleton";

export default function WearProductLoading() {
  return (
    <main className="bg-[#f7f2ec] px-3 py-5 pb-32 text-stone-900 sm:px-6 sm:py-16 sm:pb-32 md:pb-16 lg:pb-16">
      <div className="mx-auto max-w-6xl rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[0_22px_80px_-32px_rgba(120,77,42,0.18)] sm:rounded-3xl sm:p-7 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <Skeleton className="aspect-square w-full rounded-2xl sm:aspect-3/4 lg:aspect-auto lg:min-h-[min(80vh,640px)]" />
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-16 rounded-lg sm:h-24 sm:w-20" />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:justify-center lg:pr-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-9 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-3 w-24" />
            <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
              <Skeleton className="h-3 w-12" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="mt-3 h-3 w-12" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-11 w-11 rounded-full" />
                ))}
              </div>
              <Skeleton className="mt-4 h-7 w-32" />
              <Skeleton className="mt-3 h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
