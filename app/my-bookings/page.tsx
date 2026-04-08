import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "My bookings",
  "/my-bookings",
  "Your class bookings, tickets, and reschedule options on PotteryMania.",
);
import { ui } from "@/lib/ui-styles";
import { MyBookingsClient } from "./my-bookings-client";

export default function MyBookingsPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <MyBookingsClient />
      </main>
    </MarketingLayout>
  );
}
