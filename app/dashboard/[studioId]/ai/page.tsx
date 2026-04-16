import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "AI advisor", "ai", "Studio AI assistant.");
}

/** @deprecated Use `/dashboard/[studioId]/studio-tools/ai` */
export default async function LegacyAiAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/studio-tools/ai`);
}
