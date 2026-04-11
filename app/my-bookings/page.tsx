import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { metaPublicPage } from "@/lib/seo-routes";
import { platformUi } from "@/lib/ui-styles";
import { MyBookingsClient } from "./my-bookings-client";

export const metadata: Metadata = metaPublicPage(
  "Session calendar",
  "/my-bookings",
  "Today and upcoming studio sessions, reschedules, and calendar links.",
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
