import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioMembershipsClient from "@/components/dashboard/studio-memberships-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Memberships",
    "memberships",
    "Create recurring memberships, control access to classes, and monitor member usage.",
  );
}

export default async function StudioMembershipsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [experiences, memberships] = await Promise.all([
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.membership.findMany({
      where: { studioId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        experiences: {
          include: {
            experience: { select: { id: true, title: true } },
          },
        },
        _count: { select: { purchases: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Revenue</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Memberships</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Create member-only plans with duration, usage limits, and recurring pricing.
        </p>
      </div>
      <StudioMembershipsClient studioId={studioId} experiences={experiences} initialMemberships={memberships} />
    </div>
  );
}
