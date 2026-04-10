import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { metaPublicPage } from "@/lib/seo-routes";
import { platformUi } from "@/lib/ui-styles";
import { MyBookingsClient } from "./my-bookings-client";

export const metadata: Metadata = metaPublicPage(
  "My bookings",
  "/my-bookings",
  "Your class bookings, tickets, and reschedule options on PotteryMania.",
);

export default function MyBookingsPage() {
  return (
    <PlatformChrome headerVariant="account">
      <main className={`${platformUi.pageContainer} py-8 sm:py-12`}>
        <MyBookingsClient />
      </main>
    </PlatformChrome>
  );
}
