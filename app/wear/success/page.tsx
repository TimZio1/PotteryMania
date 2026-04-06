import { Suspense } from "react";
import type { Metadata } from "next";
import { WearSuccessClient } from "@/components/wear/wear-success-client";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Wear — Thank you",
  description: "Your PotteryMania wear order.",
  path: "/wear/success",
});

function SuccessFallback() {
  return (
    <main className="min-h-[40vh] bg-neutral-950 px-4 py-20 text-neutral-100">
      <p className="text-center text-sm text-neutral-500">Loading…</p>
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
