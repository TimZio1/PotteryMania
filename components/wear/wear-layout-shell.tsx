import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { MarketingLayout } from "@/components/marketing-layout";
import { WearReferralCaptureBoundary } from "@/components/wear/wear-referral-capture-boundary";
import { WearSubnav } from "@/components/wear/wear-subnav";
export async function WearLayoutShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const rawCount = cookieStore.get("wear_cart_count")?.value ?? "0";
  const initialCount = Number.parseInt(rawCount, 10) || 0;

  return (
    <MarketingLayout apparelStorefront>
      {/* Isolate from marketing shell `text-[var(--foreground)]`. Use plain `text-stone-900` (no !) so ink-slab pages can set `text-[var(--clay)]` / `.pm-slab-dark`. */}
      <div className="isolate text-stone-900 antialiased [color-scheme:light]">
        <WearReferralCaptureBoundary />
        <WearSubnav initialCount={initialCount} />
        {children}
      </div>
    </MarketingLayout>
  );
}
