import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { WEAR_PREVIEW_ITEMS } from "@/lib/wear-config";
import { WEAR_ACTIVE_DROP, wearDropDefaultTitle } from "@/lib/wear-drop-config";
import { getWearPreviewItemsFromDb } from "@/lib/wear-preview-items";
/** Prisma (Railway internal DB host) is not reachable during image build / prerender. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: `${wearDropDefaultTitle()} — Shop`,
  description:
    `Identity-led apparel — made with heat. Prices in EUR; shipping and taxes at checkout. ${WEAR_ACTIVE_DROP.launchWindowLabel} drop window.`,
  path: "/wear",
});

export default async function WearRoute() {
  if (isApparelOnlyLaunch()) {
    redirect("/wear/shop");
  }
  const fromDb = await getWearPreviewItemsFromDb();
  const previewItems = fromDb.length > 0 ? fromDb : WEAR_PREVIEW_ITEMS;
  return <WearPage previewItems={previewItems} />;
}
