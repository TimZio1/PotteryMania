import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StudioHeroGallery } from "@/components/marketing/studio-hero-gallery";
import { StudioProductAddToCart } from "@/components/marketing/studio-product-add-to-cart";
import { ui } from "@/lib/ui-styles";
import { resolveStudioPublicTheme } from "@/lib/studio-theme/resolve";
import { StudioThemeRoot } from "@/components/studio-public/studio-theme-root";
import { redirectEndUserIfStudioHasNoPublicOfferings } from "@/lib/public-catalog-guard";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import { buildMetadata } from "@/lib/seo";
import { parsePublicServiceModes } from "@/lib/studio-public-service-modes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: {
      displayName: true,
      shortDescription: true,
      longDescription: true,
      coverImageUrl: true,
      city: true,
      country: true,
    },
  });

  if (!studio) {
    return buildMetadata({
      title: "Studio not found",
      description: "This pottery studio could not be found.",
      path: `/studios/${studioId}`,
    });
  }

  return buildMetadata({
    title: studio.displayName,
    description:
      studio.shortDescription ||
      studio.longDescription ||
      `Explore ${studio.displayName} in ${studio.city}, ${studio.country} on PotteryMania.`,
    path: `/studios/${studioId}`,
    image: studio.coverImageUrl || undefined,
  });
}

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
  const allowEmptyPublicProfile = !studio.activationPaidAt;
  redirectEndUserIfStudioHasNoPublicOfferings(
    session?.user?.role,
    experiences.length,
    products.length,
    allowEmptyPublicProfile,
  );

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
    <Breadcrumbs
      items={[
        { label: "Studio website" },
        { label: studio.displayName },
      ]}
    />
  );

  const resolvedTheme = resolveStudioPublicTheme(studio);
  const svc = parsePublicServiceModes(studio.publicServiceModes);

  const classesHidden = svc.classes.mode === "hidden";
  const classesVisible = svc.classes.mode === "visible";
  const classesLink = svc.classes.mode === "visible_link" && svc.classes.linkUrl;
  const classesActive = svc.classes.mode === "active";

  const shopHidden = svc.shop.mode === "hidden";
  const shopVisible = svc.shop.mode === "visible";
  const shopLink = svc.shop.mode === "visible_link" && svc.shop.linkUrl;
  const shopActive = svc.shop.mode === "active";

  const contactHidden = svc.contact.mode === "hidden";
  const contactLink = svc.contact.mode === "visible_link" && svc.contact.linkUrl;
  const contactActive = svc.contact.mode === "active";

  const hasClassBookableContent = upcomingSlots.length > 0 || experiences.length > 0;
  const showClassHeroCta =
    !classesHidden && (hasClassBookableContent || classesVisible || Boolean(classesLink));
  const showShopHeroCta = !shopHidden && (products.length > 0 || shopVisible || Boolean(shopLink));

  return (
    <MarketingLayout toolbar={toolbar}>
      <main data-pm-visual="studio" className={`${ui.pageContainer} py-8 sm:py-12`}>
        <StudioThemeRoot theme={resolvedTheme}>
          <div className="st-card">
            <StudioHeroGallery images={galleryUrls} />
            <div className="p-6 sm:p-8">
              <p className="st-muted text-sm">
                {studio.city}, {studio.country}
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="st-h1 text-3xl font-semibold sm:text-4xl">{studio.displayName}</h1>
                  {avgRating > 0 ? (
                    <p className="st-accent-text mt-2 text-sm font-medium">
                      ★ {avgRating.toFixed(1)} average · {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                {studio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={studio.logoUrl}
                    alt={`${studio.displayName} logo`}
                    className="st-media h-14 w-14 shrink-0 border border-[var(--st-border)] bg-[var(--st-surface-bg)] object-contain p-1 sm:h-16 sm:w-16"
                  />
                ) : null}
              </div>
              {studio.shortDescription ? (
                <p className="st-body mt-4 text-base leading-relaxed">{studio.shortDescription}</p>
              ) : null}
              {!studio.activationPaidAt ? (
                <p className="st-pill mt-4">Free listing profile. Classes and product checkout become available after Stripe connection.</p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                {showClassHeroCta ? (
                  classesActive && hasClassBookableContent ? (
                    <a
                      href={upcomingSlots.length > 0 ? "#upcoming-sessions" : "#studio-classes"}
                      className="st-btn-primary"
                    >
                      Book a class
                    </a>
                  ) : classesLink && svc.classes.linkUrl ? (
                    <a href={svc.classes.linkUrl} target="_blank" rel="noreferrer" className="st-btn-primary">
                      Book a class
                    </a>
                  ) : classesVisible ? (
                    <span
                      className="st-btn-primary inline-flex cursor-not-allowed items-center opacity-65"
                      aria-disabled="true"
                    >
                      Book a class
                    </span>
                  ) : null
                ) : null}
                {showShopHeroCta ? (
                  shopActive && products.length > 0 ? (
                    <a href="#studio-shop" className="st-btn-secondary">
                      Visit shop
                    </a>
                  ) : shopLink && svc.shop.linkUrl ? (
                    <a href={svc.shop.linkUrl} target="_blank" rel="noreferrer" className="st-btn-secondary">
                      Visit shop
                    </a>
                  ) : shopVisible ? (
                    <span
                      className="st-btn-secondary inline-flex cursor-not-allowed items-center opacity-65"
                      aria-disabled="true"
                    >
                      Visit shop
                    </span>
                  ) : null
                ) : null}
                {!contactHidden ? (
                  contactActive ? (
                    <a
                      href={`mailto:${encodeURIComponent(studio.email)}?subject=${encodeURIComponent(`Question about ${studio.displayName}`)}`}
                      className="st-btn-secondary"
                    >
                      Contact
                    </a>
                  ) : contactLink && svc.contact.linkUrl ? (
                    <a href={svc.contact.linkUrl} target="_blank" rel="noreferrer" className="st-btn-secondary">
                      Contact
                    </a>
                  ) : (
                    <span
                      className="st-btn-secondary inline-flex cursor-not-allowed items-center opacity-65"
                      aria-disabled="true"
                    >
                      Contact
                    </span>
                  )
                ) : null}
              </div>

              {studio.longDescription ? (
                <div className="st-body mt-6 whitespace-pre-wrap text-sm leading-relaxed">{studio.longDescription}</div>
              ) : null}

              {(studio.instagramUrl || studio.facebookUrl || studio.websiteUrl) && (
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  {studio.websiteUrl ? (
                    <a href={studio.websiteUrl} target="_blank" rel="noreferrer" className="st-link">
                      Website
                    </a>
                  ) : null}
                  {studio.instagramUrl ? (
                    <a href={studio.instagramUrl} target="_blank" rel="noreferrer" className="st-link">
                      Instagram
                    </a>
                  ) : null}
                  {studio.facebookUrl ? (
                    <a href={studio.facebookUrl} target="_blank" rel="noreferrer" className="st-link">
                      Facebook
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {!classesHidden && upcomingSlots.length > 0 ? (
            <section id="upcoming-sessions" className="st-section">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="st-h2">Upcoming sessions</h2>
                {experiences.length > 0 ? (
                  <a href="#studio-classes" className="st-link text-sm">
                    View this studio&apos;s classes
                  </a>
                ) : null}
              </div>
              <p className="st-muted mt-1 text-sm">
                {classesVisible
                  ? "Schedule preview — PotteryMania booking is not enabled for this studio yet."
                  : "Open times with availability — reserve on the class page."}
              </p>
              <ul className="st-list-shell st-divide-y mt-6">
                {upcomingSlots.map((slot) => {
                  const rem = slot.capacityTotal - slot.capacityReserved;
                  const dateLabel = slot.slotDate.toISOString().slice(0, 10);
                  const book =
                    classesActive ? (
                      <Link
                        href={`/classes/${slot.experience.id}?slot=${slot.id}`}
                        className="st-btn-secondary shrink-0 self-start sm:self-center"
                      >
                        Book
                      </Link>
                    ) : classesLink && svc.classes.linkUrl ? (
                      <a
                        href={svc.classes.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="st-btn-secondary shrink-0 self-start sm:self-center"
                      >
                        Book
                      </a>
                    ) : (
                      <span className="st-muted shrink-0 self-start text-sm sm:self-center">Not bookable here</span>
                    );
                  return (
                    <li key={slot.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="st-h3 text-base">{slot.experience.title}</p>
                        <p className="st-muted mt-0.5 text-sm">
                          {dateLabel} · {slot.startTime}–{slot.endTime}
                          <span> · {rem} spot{rem === 1 ? "" : "s"} left</span>
                        </p>
                      </div>
                      {book}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {!classesHidden ? (
            <section id="studio-classes" className="st-section">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="st-h2">Classes</h2>
                {upcomingSlots.length > 0 ? (
                  <a href="#upcoming-sessions" className="st-link text-sm">
                    Jump to upcoming sessions
                  </a>
                ) : null}
              </div>
              <div className="st-grid md-2 lg-3 mt-6">
                {experiences.map((experience) => {
                  const body = (
                    <>
                      <div className="aspect-video bg-stone-100">
                        {experience.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={experience.images[0].imageUrl}
                            alt={experience.title}
                            className="st-media h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="st-h3 text-base">{experience.title}</h3>
                        <p className="st-accent-text mt-1 text-sm font-medium">
                          €{(experience.priceCents / 100).toFixed(2)} / person
                        </p>
                      </div>
                    </>
                  );
                  if (classesActive) {
                    return (
                      <Link key={experience.id} href={`/classes/${experience.id}`} className="st-tile">
                        {body}
                      </Link>
                    );
                  }
                  if (classesLink && svc.classes.linkUrl) {
                    return (
                      <a
                        key={experience.id}
                        href={svc.classes.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="st-tile block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--st-accent)]"
                      >
                        {body}
                      </a>
                    );
                  }
                  return (
                    <div key={experience.id} className="st-tile">
                      {body}
                    </div>
                  );
                })}
              </div>
              {experiences.length === 0 ? <p className="st-muted mt-4 text-sm">No public classes yet.</p> : null}
            </section>
          ) : null}

          {!shopHidden ? (
            <section id="studio-shop" className="st-section">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="st-h2">Products</h2>
                <a href="#studio-shop" className="st-link text-sm">
                  Studio-owned shop
                </a>
              </div>
              <div className="st-grid md-2 lg-3 mt-6">
                {products.map((product) => {
                  const tileInner = (
                    <>
                      <div className="aspect-square bg-stone-100">
                        {product.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0].imageUrl}
                            alt={product.title}
                            className="st-media h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="st-h3 text-base">{product.title}</h3>
                        <p className="st-accent-text mt-1 text-sm font-medium">
                          €{(((product.salePriceCents ?? product.priceCents) as number) / 100).toFixed(2)}
                        </p>
                      </div>
                    </>
                  );
                  const wrapClass =
                    "block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--st-accent)]";
                  const cardTop =
                    shopActive ? (
                      <Link href={`/marketplace/products/${product.id}`} className={wrapClass}>
                        {tileInner}
                      </Link>
                    ) : shopLink && svc.shop.linkUrl ? (
                      <a href={svc.shop.linkUrl} target="_blank" rel="noreferrer" className={wrapClass}>
                        {tileInner}
                      </a>
                    ) : (
                      <div className={wrapClass}>{tileInner}</div>
                    );
                  return (
                    <div key={product.id} className="st-tile">
                      {cardTop}
                      {shopActive ? (
                        <div className="border-t border-[var(--st-border)] px-4 pb-4">
                          <StudioProductAddToCart
                            productId={product.id}
                            checkoutEnabled={marketplaceCheckoutEnabled}
                            studioThemed
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {products.length === 0 ? <p className="st-muted mt-4 text-sm">No active products yet.</p> : null}
            </section>
          ) : null}

          <ReviewSummary
            title="Studio reviews"
            avgRating={avgRating}
            count={reviews.length}
            reviews={reviews}
            studioThemed
          />
        </StudioThemeRoot>
      </main>
    </MarketingLayout>
  );
}
