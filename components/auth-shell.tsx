import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ui } from "@/lib/ui-styles";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-[var(--pm-space-4)] py-[var(--pm-space-8)] sm:px-[var(--pm-space-6)] sm:py-[var(--pm-space-16)]">
      <div className={ui.narrowContainer}>
        <BrandLogo className="mb-6" size="sm" />
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
        >
          &larr; Back to home
        </Link>
        <div className={`${ui.card} mt-8`}>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          {description ? <p className="mt-2 text-sm text-[var(--muted)]">{description}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          <Link href="/terms" className="underline-offset-2 hover:text-[var(--accent)] hover:underline">
            Terms
          </Link>
          <span className="mx-2 text-[var(--border)]" aria-hidden>
            &middot;
          </span>
          <Link href="/privacy" className="underline-offset-2 hover:text-[var(--accent)] hover:underline">
            Privacy
          </Link>
          <span className="mx-2 text-[var(--border)]" aria-hidden>
            &middot;
          </span>
          <Link href="/vendor-terms" className="underline-offset-2 hover:text-[var(--accent)] hover:underline">
            Studio terms
          </Link>
        </p>
      </div>
    </div>
  );
}
