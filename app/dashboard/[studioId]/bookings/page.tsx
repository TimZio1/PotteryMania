import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Sessions", "bookings", "Review and manage studio reservations.");
}

/** @deprecated Use `/dashboard/[studioId]/schedule/sessions` */
export default async function LegacyBookingsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/schedule/sessions`);
}
