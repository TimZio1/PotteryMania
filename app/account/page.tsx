import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";
import { AccountClient } from "./account-client";

export const metadata: Metadata = buildMetadata({
  title: "Account",
  description: "Manage your PotteryMania profile, name, phone, and preferences.",
  path: "/account",
});

export default function AccountPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <AccountClient />
      </main>
    </MarketingLayout>
  );
}
