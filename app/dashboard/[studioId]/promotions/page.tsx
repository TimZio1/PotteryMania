import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Promotions", "promotions", "Create studio-specific discount codes with usage limits and minimum spend rules.");
}

/** @deprecated Use `/dashboard/[studioId]/commerce/promotions` */
export default async function LegacyPromotionsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/commerce/promotions`);
}
