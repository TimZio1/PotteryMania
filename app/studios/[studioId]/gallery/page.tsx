import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ studioId: string }> };

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-amber-950">{studio.displayName} gallery</h1>
      <p className="mt-2 text-sm text-stone-600">
        <Link href={`/studios/${studio.id}`} className="underline">
          Back to studio profile
        </Link>
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img) => (
          <article key={img.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <Image src={img.imageUrl} alt={img.caption ?? studio.displayName} width={1200} height={700} className="h-52 w-full object-cover" unoptimized />
            {img.caption ? <p className="p-3 text-sm text-stone-700">{img.caption}</p> : null}
          </article>
        ))}
      </div>
      {items.length === 0 ? <p className="mt-8 text-sm text-stone-600">No gallery images published yet.</p> : null}
    </main>
  );
}
