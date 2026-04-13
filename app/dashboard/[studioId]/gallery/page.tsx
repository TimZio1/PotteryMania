import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";

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
    select: { ownerUserId: true, displayName: true },
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
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Gallery</h1>
        <p className="mt-2 text-sm text-stone-600">
          Active images shown in your public studio gallery. Use `/api/studios/{studioId}/gallery-images` to add and sort.
        </p>
      </div>
      <section className={ui.card}>
        {items.length === 0 ? (
          <p className="text-sm text-stone-600">No gallery images yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((img) => (
              <article key={img.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <Image
                  src={img.imageUrl}
                  alt={img.caption ?? studio.displayName}
                  width={640}
                  height={320}
                  className="h-44 w-full object-cover"
                  unoptimized
                />
                <div className="p-3">
                  <p className="text-xs text-stone-500">Order: {img.sortOrder}</p>
                  <p className="mt-1 text-sm text-stone-800">{img.caption || "No caption"}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
