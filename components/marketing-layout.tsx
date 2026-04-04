import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { ui } from "@/lib/ui-styles";

type Props = {
  children: ReactNode;
  /** Optional row under header: back link, breadcrumbs, etc. */
  toolbar?: ReactNode;
};

export function MarketingLayout({ children, toolbar }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader showPublicSignIn={!isPreregistrationOnly()} />
      {toolbar ? (
        <div className="border-b border-(--brand-line) bg-white/80">
          <div className={`${ui.pageContainer} py-3`}>{toolbar}</div>
        </div>
      ) : null}
      {children}
      <footer className="mt-auto border-t border-(--brand-line) bg-(--brand-soft)">
        <div className={`${ui.pageContainer} py-12 sm:py-14`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-md">
              <p className="text-base font-semibold tracking-[0.01em] text-(--brand-ink)">
                <span className="font-serif text-[1.08em] font-normal tracking-tight">Pottery</span>
                <span>Mania</span>
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">
                The ceramics platform for independent studios and makers. Built to sell work beautifully, fill classes,
                and help serious studios grow with more presence.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-stone-700">
              <Link href="/early-access" className="transition hover:text-(--brand-ink)">
                Early access
              </Link>
              {!isPreregistrationOnly() ? (
                <Link href="/login" className="transition hover:text-(--brand-ink)">
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-(--brand-line) pt-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} PotteryMania.</p>
            <p>Made with clay and code.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
