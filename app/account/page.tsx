import type { Metadata } from "next";
import { PlatformChrome } from "@/components/platform/platform-chrome";
import { buildMetadata } from "@/lib/seo";
import { platformUi } from "@/lib/ui-styles";
import { AccountClient } from "./account-client";

export const metadata: Metadata = buildMetadata({
  title: "Account",
  description: "Manage your PotteryMania profile, name, phone, and preferences.",
  path: "/account",
});

export default function AccountPage() {
  return (
    <PlatformChrome headerVariant="account">
      <main className={`${platformUi.pageContainer} py-8 sm:py-12`}>
        <AccountClient />
      </main>
    </PlatformChrome>
  );
}
