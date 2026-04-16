import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Public page", "template", "Choose your business template.");
}

/** @deprecated Use `/dashboard/[studioId]/site/page` */
export default async function LegacyTemplateAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/site/page`);
}
