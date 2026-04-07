import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { MarketingLayout } from "@/components/marketing-layout";
import { WearSubnav } from "@/components/wear/wear-subnav";

export async function WearLayoutShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const rawCount = cookieStore.get("wear_cart_count")?.value ?? "0";
  const initialCount = Number.parseInt(rawCount, 10) || 0;

  return (
    <MarketingLayout>
      <WearSubnav initialCount={initialCount} />
      {children}
    </MarketingLayout>
  );
}
