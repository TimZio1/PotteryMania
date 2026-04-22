import { Suspense } from "react";
import type { Metadata } from "next";
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
    <main className="flex min-h-[40vh] items-center justify-center bg-[#f7f2ec] px-4 py-20 text-(--brand-ink)">
      <Spinner className="text-stone-500" />
    </main>
  );
}

export default function GiftCardSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <GiftCardSuccessClient />
    </Suspense>
  );
}
