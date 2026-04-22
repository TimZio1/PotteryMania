import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import StudioAnalyticsPanel from "@/components/dashboard/studio-analytics-panel";
import StudioMarketplaceVisibility from "@/components/dashboard/studio-marketplace-visibility";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Reports", "money/reports", "Trends, demand, and how visible your studio is.");
}

export default async function StudioMoneyReportsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Money</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Reports</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Trends and demand. For totals, use Money → Overview.
        </p>
      </div>
      <StudioMarketplaceVisibility studioId={studioId} />
      <StudioAnalyticsPanel studioId={studioId} />
    </div>
  );
}
