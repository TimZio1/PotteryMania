import type { Metadata } from "next";
import { WearPage } from "@/components/wear/wear-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Wear",
  description:
    "PotteryMania wear — for creators who build their own space. Not another shop. A signal.",
  path: "/wear",
});

export default function WearRoute() {
  return <WearPage />;
}
