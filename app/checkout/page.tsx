import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";
import { metaPublicPage } from "@/lib/seo-routes";
import { CartContents } from "@/app/cart/cart-contents";

export const metadata: Metadata = metaPublicPage(
  "Checkout",
  "/checkout",
  "Review line items, shipping, discounts, and policies before secure Stripe payment.",
);

export default function CheckoutPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
          <CartContents mode="checkout" />
        </Suspense>
      </main>
    </MarketingLayout>
  );
}
