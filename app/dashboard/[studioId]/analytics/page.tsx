import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Reports", "analytics", "Trends, demand, and how visible your studio is.");
}

/** @deprecated Use `/dashboard/[studioId]/money/reports` */
export default async function LegacyAnalyticsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/money/reports`);
}
