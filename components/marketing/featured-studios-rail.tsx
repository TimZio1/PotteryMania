import Link from "next/link";
import type { FeaturedStudioCard } from "@/lib/featured-studios-public";
import { ui } from "@/lib/ui-styles";

type Props = {
  studios: FeaturedStudioCard[];
  title?: string;
};

export function FeaturedStudiosRail({ studios, title = "Featured studios" }: Props) {
  if (studios.length === 0) return null;

  return (
    <section className="border-y border-(--brand-line) bg-white">
      <div className={`${ui.pageContainer} py-12 sm:py-16`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">Spotlight</p>
            <h2 className="mt-2 font-serif text-2xl text-(--brand-ink) sm:text-3xl">{title}</h2>
          </div>
          <Link href="/studios" className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline">
            Browse all studios →
          </Link>
        </div>
        <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {studios.map((s) => (
            <Link
              key={s.placementId}
              href={`/studios/${s.studioId}`}
              className="group relative flex w-[min(100%,280px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-(--brand-line) bg-(--warm-surface) shadow-sm transition hover:border-amber-200/80 hover:shadow-md"
            >
              <div className="relative aspect-[16/10] w-full bg-stone-200">
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote studio URLs from Connect / uploads
                  <img
                    src={s.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400">No cover</div>
                )}
                {s.logoUrl ? (
                  <div className="absolute bottom-2 left-2 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.logoUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold text-(--brand-ink) group-hover:text-amber-950">{s.displayName}</h3>
                {(s.city || s.country) && (
                  <p className="mt-1 text-xs text-stone-500">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {s.shortDescription ? (
                  <p className="mt-2 line-clamp-2 text-sm text-stone-600">{s.shortDescription}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
