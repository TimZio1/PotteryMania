import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ui } from "@/lib/ui-styles";

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6 sm:py-16">
      <div className={`${ui.narrowContainer} max-w-2xl`}>
        <BrandLogo className="mb-6" size="sm" />
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-amber-900 transition hover:text-amber-950"
        >
          ← Back to home
        </Link>
        <article className={`${ui.card} mt-8`}>
          <h1 className="text-2xl font-semibold tracking-tight text-amber-950">{title}</h1>
          <p className="mt-2 text-sm text-stone-500">Last updated {LEGAL_LAST_UPDATED}</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-amber-950 [&_h2]:first:mt-0 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}

/** Display string only; change when you materially edit legal copy. */
export const LEGAL_LAST_UPDATED = "April 5, 2026";
