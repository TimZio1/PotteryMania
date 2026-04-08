import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Cart",
  "/cart",
  "Review marketplace and class items before secure Stripe checkout.",
);
import { ui } from "@/lib/ui-styles";
import { CartContents } from "./cart-contents";

export default function CartPage() {
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <CartContents />
      </main>
    </MarketingLayout>
  );
}
