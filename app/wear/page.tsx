import type { Metadata } from "next";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";
import { WEAR_PREVIEW_ITEMS } from "@/lib/wear-config";
import { getWearPreviewItemsFromDb } from "@/lib/wear-preview-items";
import { formatWearMarginPercentFromBps, resolveWearGlobalPricing } from "@/lib/wear-commission";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";
import { prisma } from "@/lib/db";

/** Prisma (Railway internal DB host) is not reachable during image build / prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Wear",
  description: "Branded studio apparel — printed on demand. You earn on every sale.",
  path: "/wear",
});

export default async function WearRoute() {
  const [fromDb, pricing, activeCreators] = await Promise.all([
    getWearPreviewItemsFromDb(),
    resolveWearGlobalPricing(),
    prisma.studioWearConfig.count({ where: { enabled: true } }).catch(() => 0),
  ]);
  const previewItems = fromDb.length > 0 ? fromDb : WEAR_PREVIEW_ITEMS;
  const avgBasePriceCents = 2500;
  const estimatedEarningPerSale = (avgBasePriceCents * pricing.defaultMarginBps) / 10000 / 100;
  const resellerProgramHref = resolveWearResellerApplicationHref();
  return (
    <WearPage
      previewItems={previewItems}
      resellerProgramHref={resellerProgramHref}
      resellerStats={{
        activeCreators,
        marginPct: formatWearMarginPercentFromBps(pricing.defaultMarginBps),
        estimatedEarningPerSale,
      }}
    />
  );
}
