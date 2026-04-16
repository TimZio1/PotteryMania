import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Calendar", "calendar", "Studio calendar and slot availability.");
}

/** @deprecated Use `/dashboard/[studioId]/schedule/calendar` */
export default async function LegacyCalendarAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/schedule/calendar`);
}
