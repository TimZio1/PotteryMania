import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { Spinner } from "@/components/ui/spinner";
import { getWearCatalogHealthSnapshot } from "@/lib/wear-catalog-health";
import { resolveWearCatalogCategory } from "@/lib/wear-categories";
import WearProductsAdminClient from "@/components/admin/wear-products-admin-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Wear products",
  "/admin/wear-products",
  "Manage PotteryMania wear catalog and sync.",
);

export const dynamic = "force-dynamic";

function ListFallback() {
  return (
    <div className="mt-8 flex">
      <Spinner />
    </div>
  );
}

export default async function AdminWearProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = await searchParams;
  const includeArchived = sp.archived === "1";

  const rows = await prisma.wearProduct.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ updatedAt: "desc" }],
    include: { _count: { select: { variants: true } } },
  });

  const initial = rows.map((r) => {
    const category = resolveWearCatalogCategory({
      slug: r.slug,
      name: r.name,
      subtitle: r.subtitle,
      description: r.description,
      spreadconnectProductTypeName: r.spreadconnectProductTypeName,
      spreadconnectCategoryData: r.spreadconnectCategoryData,
    });
    return {
      category: category.categorySlug,
      categoryLabel: category.categoryLabel,
      id: r.id,
      slug: r.slug,
      name: r.name,
      isActive: r.isActive,
      isFeatured: r.isFeatured,
      archivedAt: r.archivedAt?.toISOString() ?? null,
      priceCents: r.priceCents,
      currency: r.currency,
      variantCount: r._count.variants,
    };
  });

  const health = await getWearCatalogHealthSnapshot();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Wear products</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Catalog for the PotteryMania-native wear storefront. Archive removes pieces from the public shop without deleting
        order history. Variants drive size/color SKUs and optional per-option pricing.
      </p>

      {health.spreadconnectWarning ? (
        <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Spreadconnect</p>
          <p className="mt-1">{health.spreadconnectWarning}</p>
        </div>
      ) : null}

      {health.catalogImportHint ? (
        <div className="mt-6 rounded-2xl border border-sky-300 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
          <p className="font-semibold">Where are my Spreadshop / SPOD products?</p>
          <p className="mt-1 text-sky-900">{health.catalogImportHint}</p>
        </div>
      ) : null}

      <div
        className={`mt-6 rounded-2xl border px-4 py-4 text-sm ${
          health.shopVisibleCount > 0
            ? "border-emerald-200/80 bg-emerald-50/60 text-emerald-950"
            : "border-amber-200/90 bg-amber-50/70 text-amber-950"
        }`}
      >
        <p className="font-semibold">Live shop visibility (same rules as /wear/shop)</p>
        <p className="mt-1 text-stone-700">
          <span className="font-mono">{health.shopVisibleCount}</span> visible (
          <span className="font-mono">{health.syncedShopVisibleCount}</span> with SPOD-linked variants or external id) ·{" "}
          {health.totalProducts} total · {health.archivedCount} archived · {health.inactiveCount} inactive
        </p>
        {health.emptyDiagnosis ? <p className="mt-2 text-stone-800">{health.emptyDiagnosis}</p> : null}
        <p className="mt-2 text-xs text-stone-600">
          Spreadconnect: {health.spreadconnectConfigured ? "API key set (paid orders may submit)" : "not configured"}
          {health.spreadconnectConfigured
            ? ` · SC failures (24h): ${health.spreadconnectFailuresLast24h}, successes: ${health.spreadconnectSubmissionsLast24h}`
            : null}
        </p>
        {health.unknownImageHosts?.length ? (
          <p className="mt-2 text-xs text-amber-900">
            Image hosts not in Next image config: {health.unknownImageHosts.join(", ")} — add to{" "}
            <span className="font-mono">next.config.ts</span> and redeploy.
          </p>
        ) : null}
        {health.brokenImages?.length ? (
          <p className="mt-2 text-xs text-red-800">
            Sampled product images returned non-OK HEAD: {health.brokenImages.length} (see API JSON for details).
          </p>
        ) : null}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          <Link href="/wear/shop" className="font-medium text-amber-900 underline">
            Open public shop
          </Link>
          <span>
            JSON: <span className="font-mono">GET /api/admin/wear-catalog-health</span>
          </span>
        </p>
      </div>

      <Suspense fallback={<ListFallback />}>
        <WearProductsAdminClient initial={initial} />
      </Suspense>
    </div>
  );
}
