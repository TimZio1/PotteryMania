import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) return buildMetadata({ title: "Gallery", description: "Studio gallery.", path: `/studios/${studioId}/gallery` });
  return buildMetadata({
    title: `${studio.displayName} — Gallery`,
    description: `Browse the photo gallery for ${studio.displayName}.`,
    path: `/studios/${studioId}/gallery`,
  });
}

export default async function StudioPublicGalleryPage({ params }: Props) {
  const { studioId } = await params;
  const [studio, items] = await Promise.all([
    prisma.studio.findFirst({
      where: { id: studioId, status: "approved" },
      select: { id: true, displayName: true },
    }),
    prisma.studioGalleryImage.findMany({
      where: { studioId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 60,
    }),
  ]);
  if (!studio) notFound();

  const toolbar = (
    <Breadcrumbs items={[{ label: studio.displayName, href: `/studios/${studio.id}` }, { label: "Gallery" }]} />
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <h1 className="text-3xl font-semibold tracking-tight text-amber-950">{studio.displayName} gallery</h1>
        <p className="mt-2 text-sm text-stone-600">
          Photos from the studio and its work.
        </p>
        {items.length === 0 ? (
          <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
            <p className="font-medium text-stone-800">No gallery images yet</p>
            <p className="mt-2 text-sm text-stone-600">
              Check back soon — the studio may add photos at any time.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((img) => (
              <article key={img.id} className="group overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition hover:shadow-md">
                <Image
                  src={img.imageUrl}
                  alt={img.caption ?? studio.displayName}
                  width={1200}
                  height={700}
                  className="aspect-[16/10] w-full object-cover transition group-hover:scale-[1.02]"
                  unoptimized
                />
                {img.caption ? (
                  <p className="px-4 py-3 text-sm text-stone-700">{img.caption}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
