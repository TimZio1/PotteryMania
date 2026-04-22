import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { metaPublicPage } from "@/lib/seo-routes";
import { platformUi } from "@/lib/ui-styles";
import { MyWaitlistClient } from "./my-waitlist-client";

export const metadata: Metadata = metaPublicPage(
  "My waitlist",
  "/my-waitlist",
  "Classes you’re waiting for a spot on.",
);

export default function MyWaitlistPage() {
  return (
    <PlatformChrome headerVariant="account">
      <main className={`${platformUi.pageContainer} py-8 sm:py-12`}>
        <MyWaitlistClient />
      </main>
    </PlatformChrome>
  );
}
