import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { StudioHeroGallery } from "@/components/marketing/studio-hero-gallery";
import { StudioProductAddToCart } from "@/components/marketing/studio-product-add-to-cart";
import { ui } from "@/lib/ui-styles";
import { redirectEndUserIfStudioHasNoPublicOfferings } from "@/lib/public-catalog-guard";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

function collectGalleryUrls(
  studio: { coverImageUrl: string | null; logoUrl: string | null },
  experiences: { images: { imageUrl: string }[] }[],
  products: { images: { imageUrl: string }[] }[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  function push(u: string | null | undefined) {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  }
  push(studio.coverImageUrl);
  push(studio.logoUrl);
  for (const e of experiences) {
    for (const im of e.images) push(im.imageUrl);
  }
  for (const p of products) {
    for (const im of p.images) push(im.imageUrl);
  }
  return out.slice(0, 12);
}

export default async function StudioPage({ params }: Props) {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
  });
  if (!studio) notFound();

  const [products, experiences, reviews, marketplaceCheckoutEnabled] = await Promise.all([
    prisma.product.findMany({
      where: { studioId, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 4 } },
    }),
    prisma.experience.findMany({
      where: { studioId, status: "active", visibility: "public" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 4 } },
    }),
    prisma.review.findMany({
      where: { studioId, isVisible: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { email: true } }, product: { select: { title: true } }, experience: { select: { title: true } } },
      take: 8,
    }),
    isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.marketplaceCheckoutEnabled),
  ]);

  const avgRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  const session = await auth();
  redirectEndUserIfStudioHasNoPublicOfferings(session?.user?.role, experiences.length, products.length);

  const galleryUrls = collectGalleryUrls(studio, experiences, products);

  const experienceIds = experiences.map((e) => e.id);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const upcomingSlots =
    experienceIds.length > 0
      ? (
          await prisma.bookingSlot.findMany({
            where: {
              experienceId: { in: experienceIds },
              slotDate: { gte: from },
              status: { in: ["open", "full"] },
            },
            include: {
              experience: { select: { id: true, title: true, minimumParticipants: true } },
            },
            orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
            take: 48,
          })
        )
          .filter((s) => {
            if (s.status !== "open") return false;
            const rem = s.capacityTotal - s.capacityReserved;
            return rem >= s.experience.minimumParticipants;
          })
          .slice(0, 16)
      : [];

  const toolbar = (
    <Link href="/studios" className="text-sm font-medium text-amber-900 hover:text-amber-950">
      ← All studios
    </Link>
  );

  const productCardShell =
    "overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition hover:border-amber-300/50 hover:shadow-md";

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
          <StudioHeroGallery images={galleryUrls} />
          <div className="p-6 sm:p-8">
            <p className="text-sm text-stone-500">
              {studio.city}, {studio.country}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
                  {studio.displayName}
                </h1>
                {avgRating > 0 ? (
                  <p className="mt-2 text-sm font-medium text-amber-900">
                    ★ {avgRating.toFixed(1)} average · {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
              {studio.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studio.logoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl border border-stone-200/80 bg-white object-contain p-1 sm:h-16 sm:w-16"
                />
              ) : null}
            </div>
            {studio.shortDescription ? <p className="mt-4 text-base text-stone-700">{studio.shortDescription}</p> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {upcomingSlots.length > 0 || experiences.length > 0 ? (
                <a
                  href={upcomingSlots.length > 0 ? "#upcoming-sessions" : "#studio-classes"}
                  className={ui.buttonPrimary}
                >
                  Book a class
                </a>
              ) : null}
              {products.length > 0 ? (
                <a href="#studio-shop" className={ui.buttonSecondary}>
                  Visit shop
                </a>
              ) : null}
              <a
                href={`mailto:${encodeURIComponent(studio.email)}?subject=${encodeURIComponent(`Question about ${studio.displayName}`)}`}
                className={ui.buttonSecondary}
              >
                Contact
              </a>
            </div>

            {studio.longDescription ? (
              <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{studio.longDescription}</div>
            ) : null}

            {(studio.instagramUrl || studio.facebookUrl || studio.websiteUrl) && (
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                {studio.websiteUrl ? (
                  <a href={studio.websiteUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-900 hover:underline">
                    Website
                  </a>
                ) : null}
                {studio.instagramUrl ? (
                  <a href={studio.instagramUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-900 hover:underline">
                    Instagram
                  </a>
                ) : null}
                {studio.facebookUrl ? (
                  <a href={studio.facebookUrl} target="_blank" rel="noreferrer" className="font-medium text-amber-900 hover:underline">
                    Facebook
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {upcomingSlots.length > 0 ? (
          <section id="upcoming-sessions" className="mt-12 scroll-mt-24">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-xl font-semibold text-amber-950">Upcoming sessions</h2>
              <Link href="/classes" className="text-sm font-medium text-amber-900 hover:underline">
                Browse all classes
              </Link>
            </div>
            <p className="mt-1 text-sm text-stone-600">Open times with availability — reserve on the class page.</p>
            <ul className="mt-6 divide-y divide-stone-200/90 rounded-2xl border border-stone-200/90 bg-white shadow-sm">
              {upcomingSlots.map((slot) => {
                const rem = slot.capacityTotal - slot.capacityReserved;
                const dateLabel = slot.slotDate.toISOString().slice(0, 10);
                return (
                  <li key={slot.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900">{slot.experience.title}</p>
                      <p className="mt-0.5 text-sm text-stone-600">
                        {dateLabel} · {slot.startTime}–{slot.endTime}
                        <span className="text-stone-500"> · {rem} spot{rem === 1 ? "" : "s"} left</span>
                      </p>
                    </div>
                    <Link
                      href={`/classes/${slot.experience.id}?slot=${slot.id}`}
                      className={`${ui.buttonSecondary} shrink-0 self-start sm:self-center`}
                    >
                      Book
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section id="studio-classes" className="mt-12 scroll-mt-24">
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

        <section id="studio-shop" className="mt-12 scroll-mt-24">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold text-amber-950">Products</h2>
            <Link href="/marketplace" className="text-sm font-medium text-amber-900 hover:underline">
              Browse marketplace
            </Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className={productCardShell}>
                <Link href={`/marketplace/products/${product.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900">
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
                <div className="border-t border-stone-100 px-4 pb-4">
                  <StudioProductAddToCart productId={product.id} checkoutEnabled={marketplaceCheckoutEnabled} />
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 ? <p className="mt-4 text-sm text-stone-500">No active products yet.</p> : null}
        </section>

        <ReviewSummary title="Studio reviews" avgRating={avgRating} count={reviews.length} reviews={reviews} />
      </main>
    </MarketingLayout>
  );
}
