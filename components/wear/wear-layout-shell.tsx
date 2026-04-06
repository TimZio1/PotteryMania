import type { ReactNode } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { WearSubnav } from "@/components/wear/wear-subnav";

export function WearLayoutShell({ children }: { children: ReactNode }) {
  return (
    <MarketingLayout>
      <WearSubnav />
      {children}
    </MarketingLayout>
  );
}
