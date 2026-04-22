import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingLayout } from "@/components/marketing-layout";
import { metaPublicPage } from "@/lib/seo-routes";
import { Spinner } from "@/components/ui/spinner";
import { auth } from "@/auth";

export const metadata: Metadata = metaPublicPage(
  "Your cart",
  "/cart",
  "Review your items before heading to payment.",
);
import { ui } from "@/lib/ui-styles";
import { CartContents } from "./cart-contents";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user);
  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
          <CartContents isAuthed={isAuthed} />
        </Suspense>
      </main>
    </MarketingLayout>
  );
}
