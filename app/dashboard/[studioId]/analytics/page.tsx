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
  return dashboardStudioMeta(studioId, "Studio analytics", "analytics", "Revenue and booking analytics.");
}

export default async function StudioPanelAnalyticsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Performance</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Analytics</h1>
        <p className="mt-2 text-sm text-stone-600">Revenue and demand from paid orders and bookings.</p>
      </div>
      <StudioMarketplaceVisibility studioId={studioId} />
      <StudioAnalyticsPanel studioId={studioId} />
    </div>
  );
}
