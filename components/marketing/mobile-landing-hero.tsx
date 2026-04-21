"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type MobileLandingPanel = {
  key: "shop" | "bookings" | "wearables" | "marketplace_free";
  title: string;
  subtitle: string;
  points: readonly [string, string, string, string];
  psychologicalLine?: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  comingSoon?: boolean;
};

type Props = {
  panels: MobileLandingPanel[];
};

export function MobileLandingHero({ panels }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const labels = useMemo(
    () =>
      panels.map((panel) =>
        panel.key === "shop"
          ? "Shop"
          : panel.key === "bookings"
            ? "Bookings"
            : panel.key === "wearables"
              ? "Wearables"
              : "Browse",
      ),
    [panels],
  );

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const onScroll = () => {
      const width = node.clientWidth || 1;
      const index = Math.max(0, Math.min(panels.length - 1, Math.round(node.scrollLeft / width)));
      setActiveIndex(index);
    };

    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [panels.length]);

  function jumpTo(index: number) {
    const node = scrollerRef.current;
    if (!node) return;
    const width = node.clientWidth || 1;
    node.scrollTo({ left: width * index, behavior: "smooth" });
    setActiveIndex(index);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-700">Swipe or tap to compare</p>
        <p className="text-xs text-stone-600">
          {activeIndex + 1}/{panels.length}
        </p>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {panels.map((panel, idx) => (
          <button
            key={panel.key}
            type="button"
            onClick={() => jumpTo(idx)}
            className={`min-h-10 rounded-full border px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
              idx === activeIndex
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-stone-100 text-stone-700"
            }`}
            aria-pressed={idx === activeIndex}
            aria-label={`Show ${labels[idx]}`}
          >
            {labels[idx]}
          </button>
        ))}
      </div>
      <div
        ref={scrollerRef}
        className="flex h-[calc(100svh-16.5rem)] snap-x snap-mandatory gap-3 overflow-x-auto pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        {panels.map((panel) => (
          <div key={`mobile-${panel.key}`} className="min-w-full snap-start">
            <article
              className={`relative isolate h-full overflow-hidden rounded-(--radius-card) border bg-[#ebe3d8] ${
                panel.comingSoon
                  ? "border-amber-400/50 ring-1 ring-amber-300/35 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
                  : "border-stone-300"
              }`}
            >
              {panel.comingSoon ? (
                <div className="absolute right-3 top-3 z-20 rounded-full border border-amber-300/80 bg-amber-950/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100 shadow-sm backdrop-blur-sm">
                  Coming soon
                </div>
              ) : null}
              <Image
                src={panel.image}
                alt={panel.alt}
                fill
                priority={panel.key === "shop"}
                fetchPriority={panel.key === "shop" ? "high" : undefined}
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/75" aria-hidden />
              <div className="relative z-10 flex h-full flex-col p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-200">
                  {panel.key === "shop"
                    ? "Sell your work"
                    : panel.key === "bookings"
                      ? "Book your skills"
                      : panel.key === "wearables"
                        ? "Expand your brand"
                        : "Discover creators"}
                </p>
                <h2 className="mt-2 font-serif text-[1.65rem] leading-tight tracking-[-0.015em] text-white">
                  {panel.key === "marketplace_free" ? (
                    <>
                      <span className="block text-white">Free</span>
                      <span className="block text-[#f4d5af]">public catalog</span>
                    </>
                  ) : (
                    panel.title
                  )}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-white/90">{panel.subtitle}</p>
                {panel.psychologicalLine ? (
                  <p className="mt-2 text-xs font-medium text-[#f4d5af]">{panel.psychologicalLine}</p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-[12px] text-white/85">
                  {panel.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d5af]" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={panel.href}
                  className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-(--radius-button) px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    panel.comingSoon
                      ? "border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15 focus-visible:outline-white/40"
                      : "bg-[#f6ebde] text-stone-950 hover:bg-white focus-visible:outline-[#f6ebde]"
                  }`}
                >
                  {panel.cta}
                </Link>
              </div>
            </article>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
        {panels.map((panel, idx) => (
          <span
            key={`dot-${panel.key}`}
            className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? "w-5 bg-stone-900" : "w-1.5 bg-stone-400"}`}
          />
        ))}
      </div>
    </div>
  );
}
