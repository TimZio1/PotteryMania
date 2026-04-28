import { Suspense } from "react";
import type { Metadata } from "next";
import { WearCartPageClient } from "@/components/wear/wear-cart-page-client";
import { Spinner } from "@/components/ui/spinner";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cart",
  description:
    "Review your order — prices in EUR, shipping and taxes at checkout. Card settlement may differ by bank.",
  path: "/wear/cart",
});

function CartFallback() {
  return (
    <main
      className="pm-brand pm-slab-dark flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 py-16 !bg-[var(--ink)] !text-[var(--clay)]"
      role="status"
      aria-busy="true"
      aria-label="Loading cart"
    >
      <Spinner className="text-[var(--clay)]/45" size="lg" />
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
