import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Waitlist", "waitlist", "Waitlist entries.");
}

export default async function LegacyWaitlistRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}`);
}
