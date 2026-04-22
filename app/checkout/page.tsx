import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";
import { metaPublicPage } from "@/lib/seo-routes";
import { CartContents } from "@/app/cart/cart-contents";
import { auth } from "@/auth";

export const metadata: Metadata = metaPublicPage(
  "Review and pay",
  "/checkout",
  "Double-check your details and total, then pay securely.",
);

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user);
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
          <CartContents mode="checkout" isAuthed={isAuthed} />
        </Suspense>
      </main>
    </MarketingLayout>
  );
}
