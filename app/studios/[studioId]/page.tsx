import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioPage({ params }: Props) {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
  });
  if (!studio) notFound();

  const [products, experiences] = await Promise.all([
    prisma.product.findMany({
      where: { studioId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.experience.findMany({
      where: { studioId, status: "active", visibility: "public" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { where: { isPrimary: true }, take: 1 } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl justify-between text-sm">
          <Link href="/studios" className="text-amber-800">
            ← All studios
          </Link>
          <div className="flex gap-4 text-stone-600">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/classes">Classes</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {studio.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.coverImageUrl} alt="" className="h-64 w-full object-cover" />
          ) : null}
          <div className="p-6">
            <p className="text-sm text-stone-500">
              {studio.city}, {studio.country}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-amber-950">{studio.displayName}</h1>
            {studio.shortDescription ? <p className="mt-4 text-stone-700">{studio.shortDescription}</p> : null}
            {studio.longDescription ? (
              <div className="mt-4 whitespace-pre-wrap text-sm text-stone-600">{studio.longDescription}</div>
            ) : null}
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-amber-950">Classes</h2>
            <Link href="/classes" className="text-sm text-amber-800 underline">
              Browse all classes
            </Link>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => (
              <Link
                key={experience.id}
                href={`/classes/${experience.id}`}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow"
              >
                <div className="aspect-video bg-stone-100">
                  {experience.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={experience.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-stone-900">{experience.title}</h3>
                  <p className="mt-1 text-sm text-amber-900">€{(experience.priceCents / 100).toFixed(2)} / person</p>
                </div>
              </Link>
            ))}
          </div>
          {experiences.length === 0 ? <p className="mt-4 text-stone-500">No public classes yet.</p> : null}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-amber-950">Products</h2>
            <Link href="/marketplace" className="text-sm text-amber-800 underline">
              Browse marketplace
            </Link>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/marketplace/products/${product.id}`}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow"
              >
                <div className="aspect-square bg-stone-100">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-stone-900">{product.title}</h3>
                  <p className="mt-1 text-sm text-amber-900">
                    €{(((product.salePriceCents ?? product.priceCents) as number) / 100).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {products.length === 0 ? <p className="mt-4 text-stone-500">No active products yet.</p> : null}
        </section>
      </main>
    </div>
  );
}
