import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Payouts & bank", "money/payouts", "Bank payouts and your studio profile.");
}

/** Inlines into shell later; canonical entry today is the full studio workspace. */
export default async function StudioMoneyPayoutsPage({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/studio/${studioId}`);
}
