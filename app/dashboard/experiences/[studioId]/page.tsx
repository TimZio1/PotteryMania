import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Experiences", "experiences", "Class and experience listings.");
}

export default async function LegacyExperiencesRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/classes`);
}
