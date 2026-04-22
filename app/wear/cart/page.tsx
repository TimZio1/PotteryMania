import { Suspense } from "react";
import type { Metadata } from "next";
import { WearCartPageClient } from "@/components/wear/wear-cart-page-client";
import { Spinner } from "@/components/ui/spinner";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Wear cart",
  description: "Review your wearables and head to checkout.",
  path: "/wear/cart",
});

function CartFallback() {
  return (
    <main
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 bg-[#f7f2ec] px-4 py-16 text-stone-900"
      role="status"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <Spinner className="text-stone-500" size="lg" />
    </main>
  );
}

export default function WearCartPage() {
  return (
    <Suspense fallback={<CartFallback />}>
      <WearCartPageClient />
    </Suspense>
  );
}
