import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = metaPublicPage(
  "Cart",
  "/cart",
  "Review shop and class items before secure Stripe checkout.",
);
import { ui } from "@/lib/ui-styles";
import { CartContents } from "./cart-contents";

export default function CartPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
          <CartContents />
        </Suspense>
      </main>
    </MarketingLayout>
  );
}
