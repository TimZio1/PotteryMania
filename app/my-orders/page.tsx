import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { platformUi } from "@/lib/ui-styles";
import { metaPublicPage } from "@/lib/seo-routes";
import { MyOrdersClient } from "./my-orders-client";

export const metadata: Metadata = metaPublicPage(
  "My orders",
  "/my-orders",
  "See what you bought, track where it is, and grab your receipts.",
);

export default function MyOrdersPage() {
  return (
    <PlatformChrome headerVariant="account">
      <main className={`${platformUi.pageContainer} py-8 sm:py-12`}>
        <MyOrdersClient />
      </main>
    </PlatformChrome>
  );
}
