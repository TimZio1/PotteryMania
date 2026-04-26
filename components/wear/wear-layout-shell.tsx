import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { MarketingLayout } from "@/components/marketing-layout";
import { WearSubnav } from "@/components/wear/wear-subnav";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";

export async function WearLayoutShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const rawCount = cookieStore.get("wear_cart_count")?.value ?? "0";
  const initialCount = Number.parseInt(rawCount, 10) || 0;
  const partnerHref = resolveWearResellerApplicationHref();

  return (
    <MarketingLayout apparelStorefront>
      {/* Isolate from marketing shell `text-[var(--foreground)]` — wear uses light cream/white surfaces */}
      <div className="isolate !text-stone-900 antialiased [color-scheme:light]">
        <WearSubnav initialCount={initialCount} partnerHref={partnerHref} />
        {children}
      </div>
    </MarketingLayout>
  );
}
