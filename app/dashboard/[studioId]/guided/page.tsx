import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { GuidedApp } from "@/components/guided/guided-app";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Simple setup", "guided", "Step-by-step setup for your studio.");
}

export default async function GuidedPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      displayName: true,
      shortDescription: true,
      ownerUserId: true,
    },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <GuidedApp
      studioId={studioId}
      initialDisplayName={studio.displayName}
      initialShortDescription={studio.shortDescription ?? ""}
    />
  );
}
