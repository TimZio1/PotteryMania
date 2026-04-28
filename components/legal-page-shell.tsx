import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingLayout } from "@/components/marketing-layout";

type Props = {
  title: string;
  children: ReactNode;
};

/** Display string only; change when you materially edit legal copy. */
export const LEGAL_LAST_UPDATED = "April 5, 2026";

/**
 * Legal / policy pages — matches homepage apparel system: `pm-brand`, clay field, heat accents,
 * Anton display + Instrument-style section titles (via prose `h2`).
 */
export function LegalPageShell({ title, children }: Props) {
  return (
    <MarketingLayout>
      <main className="pm-brand min-h-[calc(100vh-6rem)] bg-[var(--clay)] text-[var(--ink)]">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20 lg:py-24">
          <p className="pm-caption text-[var(--heat)]">Legal</p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-[var(--shadow)] transition hover:text-[var(--heat)]"
          >
            ← Back to home
          </Link>

          <article className="mt-10 border-t border-[var(--ink)]/10 pt-10">
            <h1 className="pm-display text-[2rem] leading-[0.95] text-[var(--ink)] sm:text-[2.65rem] lg:text-[3rem]">{title}</h1>

            <div
              className="mt-10 space-y-6 text-sm leading-relaxed text-[var(--shadow)] [&_strong]:font-semibold [&_strong]:text-[var(--ink)] [&_a]:font-medium [&_a]:text-[var(--heat)] [&_a]:underline [&_a]:decoration-[var(--heat)]/45 [&_a]:underline-offset-[3px] [&_a]:transition hover:[&_a]:text-[var(--ink)] [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-[var(--ink)]/10 [&_h2]:pb-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-normal [&_h2]:tracking-tight [&_h2]:text-[var(--ink)] [&_h2]:first:mt-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:marker:text-[var(--heat)]"
            >
              {children}
            </div>
          </article>
        </div>
      </main>
    </MarketingLayout>
  );
}
