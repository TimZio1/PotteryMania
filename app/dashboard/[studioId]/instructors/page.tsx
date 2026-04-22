import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Instructors", "instructors", "Assign teachers to classes and see who's teaching what.");
}

/** @deprecated Use `/dashboard/[studioId]/programs/instructors` */
export default async function LegacyInstructorsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/programs/instructors`);
}
