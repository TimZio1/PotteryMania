import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Integrations",
    "integrations",
    "Website integration shortcuts for shop, bookings, and reseller e shop embeds.",
  );
}

/** @deprecated Use `/dashboard/[studioId]/site/integrations` */
export default async function LegacyIntegrationsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/site/integrations`);
}
