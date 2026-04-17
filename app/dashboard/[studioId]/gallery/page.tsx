import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioGalleryClient } from "@/components/dashboard/studio-gallery-client";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Gallery", "gallery", "Manage your public studio gallery media.");
}

export default async function StudioGalleryPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const items = await prisma.studioGalleryImage.findMany({
    where: { studioId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Marketing</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Gallery</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Active images shown in your public studio gallery. Use `/api/studios/{studioId}/gallery-images` to add and sort.
        </p>
      </div>
      <section className={ui.card}>
        <StudioGalleryClient studioId={studioId} initialItems={items} />
      </section>
    </div>
  );
}
