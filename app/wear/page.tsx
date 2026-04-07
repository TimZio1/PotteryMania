import type { Metadata } from "next";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";
import { WEAR_PREVIEW_ITEMS } from "@/lib/wear-config";
import { getWearPreviewItemsFromDb } from "@/lib/wear-preview-items";

export const metadata: Metadata = buildMetadata({
  title: "Wear",
  description:
    "PotteryMania wear — for creators who build their own space. Not another shop. A signal.",
  path: "/wear",
});

export default async function WearRoute() {
  const fromDb = await getWearPreviewItemsFromDb();
  const previewItems = fromDb.length > 0 ? fromDb : WEAR_PREVIEW_ITEMS;
  return <WearPage previewItems={previewItems} />;
}
