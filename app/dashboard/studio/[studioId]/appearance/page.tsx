import type { Metadata } from "next";
import { metaDashboardPage } from "@/lib/seo-routes";
import { StudioAppearanceClient } from "./studio-appearance-client";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return metaDashboardPage(
    "Public appearance",
    `/dashboard/studio/${studioId}/appearance`,
    "Curated theme and typography for your public studio page on PotteryMania.",
  );
}

export default async function StudioAppearancePage({ params }: Props) {
  const { studioId } = await params;
  return <StudioAppearanceClient studioId={studioId} />;
}
