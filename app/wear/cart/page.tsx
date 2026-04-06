import { Suspense } from "react";
import type { Metadata } from "next";
import { WearCartPageClient } from "@/components/wear/wear-cart-page-client";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Wear — Cart",
  description: "Your PotteryMania wear cart.",
  path: "/wear/cart",
});

function CartFallback() {
  return (
    <main className="min-h-[40vh] bg-neutral-950 px-4 py-16 text-neutral-100">
      <p className="text-center text-sm text-neutral-500">Loading cart…</p>
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
