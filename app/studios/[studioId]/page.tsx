import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioPage({ params }: Props) {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
  });
  if (!studio) notFound();

  const [products, experiences, reviews] = await Promise.all([
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
    prisma.review.findMany({
      where: { studioId, isVisible: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { email: true } }, product: { select: { title: true } }, experience: { select: { title: true } } },
      take: 8,
    }),
  ]);
  const avgRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  const toolbar = (
    <Link href="/studios" className="text-sm font-medium text-amber-900 hover:text-amber-950">
      ← All studios
    </Link>
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
          {studio.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={studio.coverImageUrl} alt="" className="h-52 w-full object-cover sm:h-64" />
          ) : null}
          <div className="p-6 sm:p-8">
            <p className="text-sm text-stone-500">
              {studio.city}, {studio.country}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
              {studio.displayName}
            </h1>
            {studio.shortDescription ? <p className="mt-4 text-base text-stone-700">{studio.shortDescription}</p> : null}
            {studio.longDescription ? (
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{studio.longDescription}</div>
            ) : null}
          </div>
        </div>

        <section className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold text-amber-950">Classes</h2>
            <Link href="/classes" className="text-sm font-medium text-amber-900 hover:underline">
              Browse all classes
            </Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => (
              <Link key={experience.id} href={`/classes/${experience.id}`} className={ui.tile}>
                <div className="aspect-video bg-stone-100">
                  {experience.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={experience.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900">{experience.title}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-950">€{(experience.priceCents / 100).toFixed(2)} / person</p>
                </div>
              </Link>
            ))}
          </div>
          {experiences.length === 0 ? <p className="mt-4 text-sm text-stone-500">No public classes yet.</p> : null}
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold text-amber-950">Products</h2>
            <Link href="/marketplace" className="text-sm font-medium text-amber-900 hover:underline">
              Browse marketplace
            </Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={`/marketplace/products/${product.id}`} className={ui.tile}>
                <div className="aspect-square bg-stone-100">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0].imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900">{product.title}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-950">
                    €{(((product.salePriceCents ?? product.priceCents) as number) / 100).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {products.length === 0 ? <p className="mt-4 text-sm text-stone-500">No active products yet.</p> : null}
        </section>

        <ReviewSummary title="Studio reviews" avgRating={avgRating} count={reviews.length} reviews={reviews} />
      </main>
    </MarketingLayout>
  );
}
