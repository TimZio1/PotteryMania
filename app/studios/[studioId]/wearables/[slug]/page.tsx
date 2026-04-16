import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { StudioThemeRoot } from "@/components/studio-public/studio-theme-root";
import { resolveStudioPublicTheme } from "@/lib/studio-theme/resolve";
import { buildMetadata } from "@/lib/seo";
import { resolveWearGlobalPricing, resolveStudioMarginBps, calculateWearPrice } from "@/lib/wear-commission";
import { resolveWearCatalogCategory, wearTopSubcategoryLabel } from "@/lib/wear-categories";
import { wearImageUrlsFromJson } from "@/lib/wear-product-json";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId, slug } = await params;
  const product = await prisma.wearProduct.findUnique({
    where: { slug },
    select: { name: true, subtitle: true },
  });
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!product || !studio) return buildMetadata({ title: "Not found", description: "Product not found.", path: `/studios/${studioId}/wearables/${slug}` });
  return buildMetadata({
    title: `${product.name} ${studio.displayName}`,
    description: product.subtitle || `${product.name} from ${studio.displayName}`,
    path: `/studios/${studioId}/wearables/${slug}`,
  });
}

function formatEur(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default async function StudioWearPdpPage({ params }: Props) {
  const { studioId, slug } = await params;

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { id: true, displayName: true, publicTheme: true, activationPaidAt: true },
  });
  if (!studio) notFound();

  const config = await prisma.studioWearConfig.findUnique({
    where: { studioId },
    select: { enabled: true, marginBps: true },
  });
  if (!config?.enabled) notFound();

  const product = await prisma.wearProduct.findFirst({
    where: { slug, isActive: true, archivedAt: null },
    include: { variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!product) notFound();

  const isSelected = await prisma.studioWearProduct.findFirst({
    where: { studioId, wearProductId: product.id },
  });
  if (!isSelected) notFound();

  const global = await resolveWearGlobalPricing();
  const marginBps = resolveStudioMarginBps(config.marginBps, global);
  const priceCents = calculateWearPrice(product.priceCents, marginBps);
  const images = wearImageUrlsFromJson(product.images);
  const theme = resolveStudioPublicTheme(studio);
  const category = resolveWearCatalogCategory({
    slug: product.slug,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    spreadconnectProductTypeName: product.spreadconnectProductTypeName,
    spreadconnectCategoryData: product.spreadconnectCategoryData,
  });

  return (
    <MarketingLayout>
      <main className="min-h-[60vh] px-4 py-10 sm:px-6">
        <StudioThemeRoot theme={theme}>
          <div className="mx-auto max-w-5xl">
            <nav className="mb-6 text-sm">
              <Link href={`/studios/${studioId}`} className="st-link">
                {studio.displayName}
              </Link>
              <span className="st-muted mx-1.5">›</span>
              <span className="st-muted">Wearables</span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-3">
                {images.length > 0 ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
                    <Image
                      src={images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  </div>
                ) : null}
                {images.length > 1 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(1, 5).map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
                        <Image src={src} alt={`${product.name} ${i + 2}`} fill className="object-cover" sizes="120px" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col">
                <h1 className="st-h1 text-2xl font-semibold sm:text-3xl">{product.name}</h1>
                <p className="st-muted mt-2 text-[11px] font-medium uppercase tracking-wide">
                  Category: {category.categoryLabel}
                  {category.topSub ? ` · ${wearTopSubcategoryLabel(category.topSub)}` : ""}
                </p>
                {product.subtitle && <p className="st-muted mt-1 text-sm">{product.subtitle}</p>}
                <p className="st-accent-text mt-4 text-2xl font-bold">{formatEur(priceCents)}</p>

                {product.variants.length > 0 ? (
                  <div className="mt-6">
                    <p className="st-muted text-xs font-medium uppercase tracking-wide">Options</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <span key={v.id} className="st-pill text-xs">
                          {v.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {product.description && (
                  <div className="st-body mt-6 whitespace-pre-line text-sm leading-relaxed">
                    {product.description}
                  </div>
                )}

                <div className="mt-8 space-y-3">
                  <Link
                    href={`/wear/${product.slug}`}
                    className="st-btn-primary inline-flex w-full items-center justify-center py-3 text-center"
                  >
                    Add to cart
                  </Link>
                  <p className="text-center text-xs text-stone-400">Handled for you. Ships directly to customer.</p>
                </div>

                <div className="mt-auto pt-8">
                  <div className="st-tile p-4 text-xs leading-5">
                    <p className="font-medium text-stone-700">No inventory needed</p>
                    <p className="mt-1 text-stone-500">This product is fulfilled and shipped on your behalf. You earn a commission on every sale.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </StudioThemeRoot>
      </main>
    </MarketingLayout>
  );
}
