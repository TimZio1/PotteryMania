import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Money overview", "payments", "What you earned — at a glance.");
}

/** @deprecated Use `/dashboard/[studioId]/money/overview` */
export default async function LegacyPaymentsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/money/overview`);
}
