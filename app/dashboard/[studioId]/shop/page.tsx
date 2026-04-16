import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Catalog", "shop", "Products, fulfillment, and direct studio sales.");
}

/** @deprecated Use `/dashboard/[studioId]/commerce/catalog` */
export default async function LegacyShopAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/commerce/catalog`);
}
