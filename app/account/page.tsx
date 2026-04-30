import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { AccountClient } from "./account-client";

export const metadata: Metadata = buildMetadata({
  title: "Your account",
  description: isApparelOnlyLaunch()
    ? "Your PotteryMania profile, wear orders, partner program, and data controls — tees, hoodies, and heat."
    : "Your PotteryMania profile, order history, shipping context, and data controls — same energy as the drop, zero clutter.",
  path: "/account",
});

export default function AccountPage() {
  return (
    <MarketingLayout apparelStorefront>
      <main className="pm-brand min-h-[65vh] bg-[var(--clay)] text-[var(--ink)] antialiased">
        <AccountClient />
      </main>
    </MarketingLayout>
  );
}
