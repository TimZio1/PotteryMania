import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Guests", "students", "Your contacts, booking history, and notes.");
}

/** @deprecated Use `/dashboard/[studioId]/guests` */
export default async function LegacyStudentsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/guests`);
}
