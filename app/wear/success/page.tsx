import { Suspense } from "react";
import type { Metadata } from "next";
import { WearSuccessClient } from "@/components/wear/wear-success-client";
import { Spinner } from "@/components/ui/spinner";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Thank you — order confirmed",
  description: "Your order is confirmed. Shipping updates follow by email.",
  path: "/wear/success",
});

function SuccessFallback() {
  return (
    <main className="pm-brand flex min-h-[40vh] items-center justify-center bg-[var(--clay)] px-4 py-20 text-[var(--ink)]">
      <Spinner className="text-[var(--shadow)]" />
    </main>
  );
}

export default function WearSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <WearSuccessClient />
    </Suspense>
  );
}
