import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GiftCardPreview from "@/components/gift-cards/gift-card-preview";
import { MarketingLayout } from "@/components/marketing-layout";
import { prisma } from "@/lib/db";
import { metaPublicPage } from "@/lib/seo-routes";
import { ui } from "@/lib/ui-styles";
import { normalizeGiftCardCode } from "@/lib/gift-cards/code";
import { validateGiftCardState } from "@/lib/gift-cards/validate";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const normalized = normalizeGiftCardCode(code);
  return metaPublicPage(
    "Gift card balance",
    `/gift-cards/${encodeURIComponent(normalized || code)}`,
    "Check the balance and status of a PotteryMania studio gift card.",
  );
}

export const dynamic = "force-dynamic";

export default async function GiftCardBalancePage({ params }: Props) {
  const { code } = await params;
  const normalized = normalizeGiftCardCode(code);
  if (!normalized) notFound();

  const giftCard = await prisma.giftCard.findUnique({
    where: { code: normalized },
    include: {
      studio: { select: { displayName: true } },
      template: true,
    },
  });
  if (!giftCard) notFound();

  const state = validateGiftCardState(giftCard);

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="max-w-2xl">
            <p className={ui.overline}>Gift card</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Gift card balance</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Code <span className="font-mono">{giftCard.code}</span>
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <GiftCardPreview
              studioName={giftCard.studio.displayName}
              code={giftCard.code}
              title={giftCard.name}
              recipientName={giftCard.recipientName}
              amountCents={giftCard.remainingValueCents}
              bgColor={giftCard.template?.bgColor}
              textColor={giftCard.template?.textColor}
              imageUrl={giftCard.template?.imageUrl}
              personalMessage={giftCard.personalMessage}
            />

            <div className={`${ui.card} space-y-4`}>
              <div>
                <p className={ui.overline}>Status</p>
                <h2 className="mt-1 text-xl font-semibold text-amber-950">
                  {state.ok ? "Ready to use" : state.error}
                </h2>
              </div>
              <dl className="space-y-2 text-sm text-stone-700">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Original value</dt>
                  <dd className="font-medium">EUR {(giftCard.originalValueCents / 100).toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Remaining balance</dt>
                  <dd className="font-medium">EUR {(giftCard.remainingValueCents / 100).toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Valid from</dt>
                  <dd className="font-medium">{giftCard.validFrom.toISOString().slice(0, 10)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-stone-500">Valid until</dt>
                  <dd className="font-medium">{giftCard.validUntil ? giftCard.validUntil.toISOString().slice(0, 10) : "No expiry"}</dd>
                </div>
              </dl>
              {giftCard.description ? (
                <p className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  {giftCard.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
