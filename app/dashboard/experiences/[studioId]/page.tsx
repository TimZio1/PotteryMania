import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Planner", "experiences", "Schedule rules, slot generation, and studio closed days.");
}

/** @deprecated Use `/dashboard/[studioId]/programs/planner` */
export default async function LegacyExperiencesPlannerRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/programs/planner`);
}
