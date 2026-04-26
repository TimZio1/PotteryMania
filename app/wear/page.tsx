import type { Metadata } from "next";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";
import { WEAR_PREVIEW_ITEMS } from "@/lib/wear-config";
import { getWearPreviewItemsFromDb } from "@/lib/wear-preview-items";
import { resolveWearResellerApplicationHref } from "@/lib/wear-reseller-application";

/** Prisma (Railway internal DB host) is not reachable during image build / prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Shop — Drop 01",
  description:
    "Limited apparel drop — identity-led pieces, printed on demand. Shipping calculated at checkout.",
  path: "/wear",
});

export default async function WearRoute() {
  const [fromDb, resellerProgramHref] = await Promise.all([
    getWearPreviewItemsFromDb(),
    Promise.resolve(resolveWearResellerApplicationHref()),
  ]);
  const previewItems = fromDb.length > 0 ? fromDb : WEAR_PREVIEW_ITEMS;
  return <WearPage previewItems={previewItems} resellerProgramHref={resellerProgramHref} />;
}
