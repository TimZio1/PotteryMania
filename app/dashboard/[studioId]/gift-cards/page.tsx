import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Gift cards", "gift-cards", "Sell and track gift cards for your studio.");
}

/** @deprecated Use `/dashboard/[studioId]/commerce/gift-cards` */
export default async function LegacyGiftCardsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/commerce/gift-cards`);
}
