import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Tax",
    "tax-report",
    "Track booking and product tax totals for accounting periods.",
  );
}

/** @deprecated Use `/dashboard/[studioId]/money/tax` */
export default async function LegacyTaxReportAlias({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/money/tax`);
}
