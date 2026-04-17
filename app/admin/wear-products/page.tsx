import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { Spinner } from "@/components/ui/spinner";
import { loadWearCatalogHealthSnapshot } from "@/lib/wear-catalog-health";
import { resolveWearCatalogCategory } from "@/lib/wear-categories";
import WearProductsAdminClient from "@/components/admin/wear-products-admin-client";
import WearSpreadconnectDevTools from "@/components/admin/wear-spreadconnect-dev-tools";

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

  const { snapshot: health, error: healthSnapshotError } = await loadWearCatalogHealthSnapshot();

  let initialBuilderJobs: {
    id: string;
    state: string;
    designImageUrl: string | null;
    errorMessage: string | null;
    wearProductId: string | null;
    createdAt: string;
  }[] = [];
  try {
    const recentBuilderJobs = await prisma.wearBuilderJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        state: true,
        designImageUrl: true,
        errorMessage: true,
        wearProductId: true,
        createdAt: true,
      },
    });
    initialBuilderJobs = recentBuilderJobs.map((j) => ({
      id: j.id,
      state: j.state,
      designImageUrl: j.designImageUrl,
      errorMessage: j.errorMessage,
      wearProductId: j.wearProductId,
      createdAt: j.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[admin/wear-products] wearBuilderJob query failed", err);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Wear products</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Catalog for the PotteryMania-native wear storefront. Archive removes pieces from the public shop without deleting
        order history. Variants drive size/color SKUs and optional per-option pricing.
      </p>

      {healthSnapshotError ? (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50/90 px-4 py-3 text-sm text-red-950">
          <p className="font-semibold">Catalog health snapshot unavailable</p>
          <p className="mt-1 break-all font-mono text-xs">{healthSnapshotError}</p>
          <p className="mt-2 text-xs text-red-900">
            The product list below may still load. If this persists, confirm <span className="font-mono">DATABASE_URL</span>{" "}
            and run <span className="font-mono">npx prisma migrate deploy</span> on the host.
          </p>
        </div>
      ) : null}

      {process.env.SPREADCONNECT_PROBE_ENABLED === "true" ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-xs text-violet-950">
          <p className="font-semibold">Spreadconnect API probes (enabled)</p>
          <p className="mt-1 text-violet-900">
            <span className="font-mono">GET /api/admin/wear-spreadconnect/probe</span> — metadata.{" "}
            <span className="font-mono">POST</span> with <span className="font-mono">action</span>:{" "}
            <span className="font-mono">authentication</span>, <span className="font-mono">design_from_url</span> +{" "}
            <span className="font-mono">imageUrl</span>, or <span className="font-mono">create_article</span> +{" "}
            <span className="font-mono">article</span> (OpenAPI ArticleCreation). Use staging first; 60 req/min.
          </p>
        </div>
      ) : null}

      <WearSpreadconnectDevTools initialJobs={initialBuilderJobs} />

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
          health.catalogTrustState === "VERIFIED"
            ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
            : health.catalogTrustState === "DEGRADED"
              ? "border-amber-300 bg-amber-50/85 text-amber-950"
              : health.catalogTrustState === "FAILED"
                ? "border-red-300 bg-red-50/90 text-red-950"
                : "border-sky-300 bg-sky-50/85 text-sky-950"
        }`}
      >
        <p className="font-semibold">Merch operations — catalog trust</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-lg tracking-tight">{health.catalogTrustState}</span>
          {typeof health.internalHealthScore === "number" ? (
            <span className="text-xs font-normal text-stone-600">
              Internal health score:{" "}
              <span className="font-mono font-semibold text-stone-800">{health.internalHealthScore}</span>
              /100 (operator-only)
            </span>
          ) : null}
        </p>
        <ul className="mt-2 list-inside list-disc text-xs text-stone-800">
          {health.catalogTrustReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <div className="mt-3 grid gap-1 text-xs text-stone-700 sm:grid-cols-2">
          <p>
            Last sync:{" "}
            <span className="font-mono">{health.lastSyncAt ?? "—"}</span> ({health.lastSyncMode ?? "—"})
          </p>
          <p>
            Last full discovery: <span className="font-mono">{health.lastFullSyncAt ?? "—"}</span>
          </p>
          <p>
            Last partial sync: <span className="font-mono">{health.lastPartialSyncAt ?? "—"}</span>
          </p>
          <p>
            Last skip ratio:{" "}
            <span className="font-mono">
              {health.lastSyncSkipRatio != null ? `${(health.lastSyncSkipRatio * 100).toFixed(1)}%` : "—"}
            </span>
          </p>
          <p>
            Duplicate SKU groups: <span className="font-mono">{health.duplicateSkuGroupCount}</span>
          </p>
          <p>
            Published+ready but not public-eligible:{" "}
            <span className="font-mono">{health.publishedReadyButNotPublicEligibleCount}</span> (fix price/SKU/publish
            rules)
          </p>
          <p>
            SC failures (24h): <span className="font-mono">{health.spreadconnectFailuresLast24h}</span>
          </p>
        </div>
        {health.lastSyncError ? (
          <p className="mt-2 text-xs font-medium text-red-900">Sync error flag: {health.lastSyncError}</p>
        ) : null}
        <p className="mt-3 text-xs text-stone-600">
          Schedule: partial cron often; <strong>full discovery</strong> daily (or use the sync checkbox below once).
          Trust requires a fresh <strong>full</strong> sync within ~36h, no duplicate SKUs, and skip ratio under 85%.
        </p>
      </div>

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
