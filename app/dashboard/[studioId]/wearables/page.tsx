import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Wearables", "wearables", "Sell apparel with no stock or shipping to handle.");
}

/** @deprecated Use `/dashboard/[studioId]/commerce/wearables` — client UI lives there. */
export default async function LegacyWearablesAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/commerce/wearables`);
}
