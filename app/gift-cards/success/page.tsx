import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";
import { Spinner } from "@/components/ui/spinner";
import { GiftCardSuccessClient } from "@/components/gift-cards/gift-card-success-client";

export const metadata: Metadata = metaPublicPage(
  "Gift card purchased",
  "/gift-cards/success",
  "Payment received — your gift card is on its way.",
);

function SuccessFallback() {
  return (
    <main className="pm-brand flex min-h-[40vh] items-center justify-center bg-[var(--clay)] px-4 py-20 text-[var(--ink)]">
      <Spinner className="text-[var(--shadow)]" />
    </main>
  );
}

export default function GiftCardSuccessPage() {
  return (
    <MarketingLayout>
      <Suspense fallback={<SuccessFallback />}>
        <GiftCardSuccessClient />
      </Suspense>
    </MarketingLayout>
  );
}
