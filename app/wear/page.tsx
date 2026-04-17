import type { Metadata } from "next";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";
import { WEAR_PREVIEW_ITEMS } from "@/lib/wear-config";
import { getWearPreviewItemsFromDb } from "@/lib/wear-preview-items";
import { resolveWearGlobalPricing } from "@/lib/wear-commission";
import { prisma } from "@/lib/db";

/** Prisma (Railway internal DB host) is not reachable during image build / prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Wear",
  description: "Wear for creators who build their own space — not another generic shop.",
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
  return (
    <WearPage
      previewItems={previewItems}
      resellerStats={{
        activeCreators,
        marginPct: `${(pricing.defaultMarginBps / 100).toFixed(1)}%`,
        estimatedEarningPerSale,
      }}
    />
  );
}
