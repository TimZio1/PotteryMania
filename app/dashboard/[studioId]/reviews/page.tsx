import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Reviews",
    "reviews",
    "Moderate visibility, feature top reviews, and keep social proof quality high.",
  );
}

/** @deprecated Use `/dashboard/[studioId]/site/reviews` */
export default async function LegacyReviewsAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/site/reviews`);
}
