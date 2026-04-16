import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { WearProductGallery } from "@/components/wear/wear-product-gallery";
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

            <WearProductGallery
              productId={product.id}
              productName={product.name}
              images={images.map((src, index) => ({
                id: `${index}-${src}`,
                url: src,
                appearanceName: null,
                perspective: null,
              }))}
              variants={product.variants.map((v) => ({
                id: v.id,
                label: v.label,
                priceCents: v.priceCents ? calculateWearPrice(v.priceCents, marginBps) : null,
                stockQuantity: v.stockQuantity,
              }))}
              basePriceCents={priceCents}
              currency={product.currency}
              studioId={studioId}
              backHref={`/studios/${studioId}`}
              categoryLabel={category.categoryLabel}
              topSubLabel={category.topSub ? wearTopSubcategoryLabel(category.topSub) : null}
              subtitle={product.subtitle}
              description={product.description}
            />
          </div>
        </StudioThemeRoot>
      </main>
    </MarketingLayout>
  );
}
