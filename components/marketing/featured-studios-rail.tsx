"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { FeaturedStudioCard } from "@/lib/featured-studios-public";
import {
  modalTransition,
  staggerContainerVariants,
  staggerItemVariants,
  staggerItemVariantsReduced,
} from "@/lib/motion-ui";
import { ui } from "@/lib/ui-styles";

type Props = {
  studios: FeaturedStudioCard[];
  title?: string;
};

export function FeaturedStudiosRail({ studios, title = "Featured studios" }: Props) {
  const reduced = useReducedMotion();
  const itemVars = reduced ? staggerItemVariantsReduced : staggerItemVariants;
  const containerVars = reduced ? { hidden: {}, visible: {} } : staggerContainerVariants;

  if (studios.length === 0) return null;

  return (
    <section className="border-y border-[var(--border)] bg-[var(--background)]">
      <div className={`${ui.pageContainer} py-12 sm:py-16`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Spotlight</p>
            <h2 className="mt-3 font-serif text-2xl font-normal tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">
              {title}
            </h2>
          </div>
          <Link
            href="/studios"
            className="text-sm font-medium text-[var(--muted)] underline decoration-[var(--border)] underline-offset-4 transition hover:text-[var(--foreground)] hover:decoration-[var(--accent)]"
          >
            Browse all studios &rarr;
          </Link>
        </div>
        <motion.div
          className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          variants={containerVars}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-20px" }}
        >
          {studios.map((s) => (
            <motion.div key={s.placementId} variants={itemVars} transition={modalTransition(reduced)} className="shrink-0">
              <Link
                href={`/studios/${s.studioId}`}
                className="group relative flex w-[min(100%,280px)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--pm-shadow-rest)] transition hover:border-[var(--accent)] hover:shadow-[var(--pm-shadow-lift)]"
              >
              <div className="relative aspect-[16/10] w-full bg-[var(--surface-elevated)]">
                {s.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverImageUrl}
                    alt={`${s.displayName} studio cover`}
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No image</div>
                )}
                {s.logoUrl ? (
                  <div className="absolute bottom-2 left-2 h-12 w-12 overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--surface)] shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.logoUrl} alt={`${s.displayName} logo`} width={48} height={48} className="h-full w-full object-cover" />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-semibold text-[var(--foreground)] transition group-hover:text-[var(--accent)]">{s.displayName}</h3>
                {(s.city || s.country) && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {s.shortDescription ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{s.shortDescription}</p>
                ) : null}
              </div>
            </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
