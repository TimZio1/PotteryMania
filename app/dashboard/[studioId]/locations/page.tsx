import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioLocationsClient } from "@/components/dashboard/studio-locations-client";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Locations", "locations", "Manage multiple studio locations.");
}

export default async function StudioLocationsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { ownerUserId: true } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const items = await prisma.studioLocation.findMany({
    where: { studioId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Business setup</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Locations</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Multiple branches for one studio account.</p>
      </div>
      <section className={ui.card}>
        <StudioLocationsClient studioId={studioId} initialItems={items} />
      </section>
    </div>
  );
}
