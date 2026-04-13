import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import GiftCardPurchaseForm from "@/components/gift-cards/gift-card-purchase-form";
import { prisma } from "@/lib/db";
import { metaPublicPage } from "@/lib/seo-routes";
import { ui } from "@/lib/ui-styles";

export const metadata: Metadata = metaPublicPage(
  "Gift cards",
  "/gift-cards",
  "Purchase pottery studio gift cards and send them with a personal message.",
);

export const dynamic = "force-dynamic";

export default async function GiftCardsPage() {
  const studios = await prisma.studio.findMany({
    where: {
      status: "approved",
      stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
    },
    orderBy: { displayName: "asc" },
    select: {
      id: true,
      displayName: true,
      shortDescription: true,
      giftCardTemplates: {
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          imageUrl: true,
          bgColor: true,
          textColor: true,
          isDefault: true,
        },
      },
    },
  });
  const purchaseStudios = studios.map((studio) => ({
    id: studio.id,
    displayName: studio.displayName,
    shortDescription: studio.shortDescription,
    templates: studio.giftCardTemplates,
  }));

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="max-w-2xl">
            <p className={ui.overline}>Revenue</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Gift cards for pottery experiences</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Send a studio gift card that can be redeemed later for classes, workshops, or shop orders.
            </p>
          </div>
          <GiftCardPurchaseForm studios={purchaseStudios} />
        </div>
      </main>
    </MarketingLayout>
  );
}
