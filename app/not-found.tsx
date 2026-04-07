import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ui } from "@/lib/ui-styles";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-(--brand-line) bg-[rgba(250,248,245,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:h-18 sm:px-6">
          <BrandLogo className="text-(--brand-ink)" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-6xl font-bold text-stone-300">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-amber-950">Page not found</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-stone-600">
          The page you are looking for does not exist or has been moved. Let us help you find what you need.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={ui.buttonPrimary}>
            Back to home
          </Link>
          <Link href="/marketplace" className={ui.buttonSecondary}>
            Explore studios
          </Link>
          <Link href="/wear/shop" className={ui.buttonSecondary}>
            Shop wearables
          </Link>
        </div>
      </main>
    </div>
  );
}
