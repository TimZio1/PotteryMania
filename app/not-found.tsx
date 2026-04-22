import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ui } from "@/lib/ui-styles";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-(--pm-space-4) sm:h-18 sm:px-(--pm-space-8)">
          <BrandLogo className="text-[var(--foreground)]" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-(--pm-space-4) py-(--pm-space-16) text-center">
        <p className="text-6xl font-bold text-[var(--border)]">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
          The link might be wrong, or the page has moved. Try heading home or browsing studios instead.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={ui.buttonPrimary}>
            Back to home
          </Link>
          <Link href="/studios" className={ui.buttonSecondary}>
            Browse studios
          </Link>
        </div>
      </main>
    </div>
  );
}
