import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "My waitlist",
  "/my-waitlist",
  "Waitlist entries for PotteryMania classes and workshops.",
);
import { ui } from "@/lib/ui-styles";
import { MyWaitlistClient } from "./my-waitlist-client";

export default function MyWaitlistPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <MyWaitlistClient />
      </main>
    </MarketingLayout>
  );
}
