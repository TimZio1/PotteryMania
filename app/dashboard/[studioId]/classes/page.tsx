import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Programs", "classes", "All your workshops, sessions, and experiences.");
}

/** @deprecated Use `/dashboard/[studioId]/programs` */
export default async function LegacyClassesAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/programs`);
}
