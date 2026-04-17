import { Suspense } from "react";
import type { Metadata } from "next";
import { WearSuccessClient } from "@/components/wear/wear-success-client";
import { Spinner } from "@/components/ui/spinner";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Wear — Thank you",
  description: "Wear order confirmation.",
  path: "/wear/success",
});

function SuccessFallback() {
  return (
    <main className="flex min-h-[40vh] items-center justify-center bg-[#f7f2ec] px-4 py-20 text-stone-900">
      <Spinner className="text-stone-500" />
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
