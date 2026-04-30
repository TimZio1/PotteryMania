import { Skeleton } from "@/components/ui/skeleton";

/** Matches `/wear/shop` shell so filter navigations show immediate feedback (not generic white skeleton). */
export default function WearShopLoading() {
  return (
    <main className="pm-brand min-h-[60vh] bg-[var(--clay)] text-[var(--ink)]">
      <div className="border-b border-[var(--ink)]/10 bg-[var(--ink)]/8 px-4 py-3 sm:px-6">
        <Skeleton className="mx-auto h-4 max-w-md rounded bg-[var(--ink)]/10" />
      </div>
      <div className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="mx-auto h-3 w-32 rounded-full bg-[var(--ink)]/10" />
          <Skeleton className="mx-auto mt-4 h-14 w-[min(100%,20rem)] rounded-lg bg-[var(--ink)]/10 sm:h-16" />
          <Skeleton className="mx-auto mt-4 h-4 w-64 max-w-full rounded bg-[var(--ink)]/10" />
          <div className="mx-auto mt-6 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-28 rounded-full bg-[var(--ink)]/10 sm:w-32" />
            ))}
          </div>
          <div className="mx-auto mt-3 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-36 rounded-full bg-[var(--ink)]/10 sm:w-40" />
            ))}
          </div>
          <div className="mx-auto mt-4 flex flex-wrap justify-end gap-2">
            <Skeleton className="h-3 w-10 rounded bg-[var(--ink)]/10" />
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-24 rounded-full bg-[var(--ink)]/10" />
            ))}
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-[var(--ink)]/12 bg-white/90 shadow-sm">
                <Skeleton className="aspect-[3/4] w-full rounded-none bg-[var(--ink)]/8" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 rounded bg-[var(--ink)]/10" />
                  <Skeleton className="mt-2 h-4 w-1/3 rounded bg-[var(--ink)]/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
