import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingLayout } from "@/components/marketing-layout";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Sign-in / register — ink slab + clay copy + heat eyebrow, aligned with `/wear/partner` + homepage slabs. */
export function AuthShell({ title, description, children }: Props) {
  return (
    <MarketingLayout apparelStorefront>
      <main className="pm-brand pm-slab-dark relative min-h-[calc(100vh-6rem)] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,rgba(255,74,28,0.14),transparent_52%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-20">
          <p className="pm-caption text-[var(--heat)]">Account</p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-[var(--clay)]/75 transition hover:text-[var(--heat)]"
          >
            ← Back to home
          </Link>

          <div className="mt-10 rounded-2xl border border-[var(--clay)]/14 bg-[var(--clay)]/[0.06] p-6 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65)] ring-1 ring-[var(--clay)]/10 sm:p-8">
            <h1 className="pm-display text-[1.85rem] leading-[0.96] text-[var(--clay)] sm:text-[2.25rem]">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--clay)]/72 sm:text-base">{description}</p>
            ) : null}
            <div className="mt-8">{children}</div>
          </div>

          <p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--clay)]/45">
            <Link
              href="/terms"
              className="text-[var(--clay)]/70 underline decoration-[var(--clay)]/25 underline-offset-4 transition hover:text-[var(--heat)] hover:decoration-[var(--heat)]"
            >
              Terms
            </Link>
            <span className="mx-2 text-[var(--clay)]/25" aria-hidden>
              ·
            </span>
            <Link
              href="/privacy"
              className="text-[var(--clay)]/70 underline decoration-[var(--clay)]/25 underline-offset-4 transition hover:text-[var(--heat)] hover:decoration-[var(--heat)]"
            >
              Privacy
            </Link>
            <span className="mx-2 text-[var(--clay)]/25" aria-hidden>
              ·
            </span>
            <Link
              href="/vendor-terms"
              className="text-[var(--clay)]/70 underline decoration-[var(--clay)]/25 underline-offset-4 transition hover:text-[var(--heat)] hover:decoration-[var(--heat)]"
            >
              Studio terms
            </Link>
          </p>
        </div>
      </main>
    </MarketingLayout>
  );
}
