import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { StudioWebIntegrationsClient } from "@/components/dashboard/studio-web-integrations-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Integrations",
    "site/integrations",
    "Website integration shortcuts for shop, bookings, and reseller e shop embeds.",
  );
}

export default async function StudioIntegrationsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });

  if (!studio || studio.ownerUserId !== user.id) notFound();

  return <StudioWebIntegrationsClient studioId={studioId} />;
}
