import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { Spinner } from "@/components/ui/spinner";
import { loadWearCatalogHealthSnapshot } from "@/lib/wear-catalog-health";
import { resolveWearCatalogCategory } from "@/lib/wear-categories";
import { loadWearCatalogValueSnapshot } from "@/lib/wear-spreadconnect-stats";
import { formatWearMoney } from "@/lib/wear-money";
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

function looksLikeMissingDbColumn(msg: string) {
  return msg.includes("does not exist") && msg.includes("column");
}

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

  let initial: {
    category: string;
    categoryLabel: string;
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    isFeatured: boolean;
    archivedAt: string | null;
    priceCents: number;
    currency: string;
    variantCount: number;
  }[] = [];
  let productListError: string | null = null;

  try {
    const rows = await prisma.wearProduct.findMany({
      where: includeArchived ? {} : { archivedAt: null },
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { variants: true } } },
    });

    initial = rows.map((r) => {
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/wear-products] product list query failed", err);
    productListError = msg;
  }

  const { snapshot: health, error: healthSnapshotError } = await loadWearCatalogHealthSnapshot();

  let catalogValue: Awaited<ReturnType<typeof loadWearCatalogValueSnapshot>> | null = null;
  let catalogValueError: string | null = null;
  try {
    catalogValue = await loadWearCatalogValueSnapshot();
  } catch (err) {
    catalogValueError = err instanceof Error ? err.message : String(err);
    console.error("[admin/wear-products] catalog value snapshot failed", err);
  }

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

  const dbErrorLines = [productListError, healthSnapshotError].filter((x): x is string => Boolean(x));
  const dbErrorCombined = dbErrorLines.length > 0;
  const likelyMissingMigration = dbErrorLines.some(looksLikeMissingDbColumn);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Wear products</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Catalog for the PotteryMania-native wear storefront. Archive removes pieces from the public shop without deleting
        order history. Variants drive size/color SKUs and optional per-option pricing.
      </p>
      <p className="mt-2 text-sm">
        <Link
          href="/admin/settings#wear-markup"
          className="font-medium text-amber-900 underline-offset-2 hover:underline"
        >
          Platform retail markup on Spreadconnect base cost
        </Link>
        <span className="text-[var(--muted)]"> — default %, min/max, lock studio editing.</span>
      </p>

      {catalogValue ? (
        <section
          aria-label="Spreadconnect catalog value"
          className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                Spreadconnect catalog value
              </p>
              <p className="mt-1 text-sm text-stone-700">
                Sum across <strong>{catalogValue.activeProducts}</strong> active products ·{" "}
                <strong>{catalogValue.totalVariants}</strong> live variants. One unit per saleable variant —
                stock is unbounded for POD.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                catalogValue.usingInternalPricing
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  catalogValue.usingInternalPricing ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              {catalogValue.usingInternalPricing ? "Internal pricing on" : "DB list prices"}
            </span>
          </div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                Catalog value
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-amber-950">
                {formatWearMoney(catalogValue.totalCatalogValueCents, catalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">
                Sum of list prices · 1 unit per live variant
              </p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Catalog cost (COGS)
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-stone-800">
                {formatWearMoney(catalogValue.totalCatalogCostCents, catalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">
                Spreadconnect supply cost or fallback floor
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Estimated margin
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800">
                {formatWearMoney(catalogValue.totalCatalogMarginCents, catalogValue.currency)}
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">
                Catalog value − catalog cost (per-unit, pre-discount)
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                Spreadconnect-linked
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight text-sky-900">
                {catalogValue.spreadconnectLinkedProducts}
                <span className="ml-1 text-base font-medium text-stone-500">
                  / {catalogValue.totalProducts}
                </span>
              </dd>
              <p className="mt-1 text-[11px] text-stone-500">
                Products with externalFulfillmentId or article id
              </p>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-stone-500">
            Read-only snapshot — refresh on every page load. JSON:{" "}
            <span className="font-mono">GET /api/admin/wear/catalog-value</span>
          </p>
        </section>
      ) : null}

      {catalogValueError ? (
        <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Could not load Spreadconnect catalog value: {catalogValueError}
        </p>
      ) : null}

      <section
        aria-label="Daily Spreadconnect price refresh"
        className="mt-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">Daily price refresh from Spreadconnect</p>
          <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            Auto · 24h
          </span>
        </div>
        <p className="mt-1 text-emerald-900/95">
          The catalog cron pulls every linked article&apos;s <strong>d2cPrice</strong> (list) and{" "}
          <strong>b2bPrice</strong> (supply / COGS) once a day and writes them to the wear catalog. Use the{" "}
          <em>Sync Spreadconnect catalog</em> button below to force a refresh now.
        </p>
        <p className="mt-2 text-[11px] text-emerald-900/80">
          Cron path: <span className="font-mono">GET /api/cron/wear-catalog-sync</span> · auth:{" "}
          <span className="font-mono">Authorization: Bearer $CRON_SECRET</span> · recommended schedule:{" "}
          <span className="font-mono">0 4 * * *</span> (04:00 UTC daily).
        </p>
        <p className="mt-1 text-[11px] text-emerald-900/80">
          Last sync:{" "}
          <span className="font-mono">{health.lastSyncAt ?? "—"}</span> (
          {health.lastSyncMode ?? "—"}) ·{" "}
          {health.spreadconnectConfigured ? "API key set" : "API key NOT configured"}
        </p>
      </section>

      {dbErrorCombined ? (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            likelyMissingMigration
              ? "border-amber-300 bg-amber-50/95 text-amber-950"
              : "border-red-300 bg-red-50/90 text-red-950"
          }`}
        >
          <p className="font-semibold">
            {likelyMissingMigration
              ? "Production database is missing columns this app version expects"
              : "Could not load wear data from the database"}
          </p>
          <p className={`mt-2 text-sm ${likelyMissingMigration ? "text-amber-950/95" : "text-red-900"}`}>
            {likelyMissingMigration ? (
              <>
                The code was deployed, but the database was not updated yet. On the machine or CI that has your production{" "}
                <code className="rounded bg-white/60 px-1 font-mono text-xs">DATABASE_URL</code>, run{" "}
                <code className="rounded bg-white/60 px-1 font-mono text-xs">npx prisma migrate deploy</code>, then reload
                this page.
              </>
            ) : (
              <>
                Check <code className="font-mono text-xs">DATABASE_URL</code> and connectivity. If the app was just deployed,
                run <code className="font-mono text-xs">npx prisma migrate deploy</code> on the production database.
              </>
            )}
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium opacity-90">Show technical message</summary>
            {dbErrorLines.map((line, i) => (
              <p key={i} className="mt-2 break-all font-mono text-[11px] leading-relaxed opacity-90">
                {line}
              </p>
            ))}
          </details>
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
            <span className="text-xs font-normal text-[var(--muted)]">
              Internal health score:{" "}
              <span className="font-mono font-semibold text-[var(--foreground)]">{health.internalHealthScore}</span>
              /100 (operator-only)
            </span>
          ) : null}
        </p>
        <ul className="mt-2 list-inside list-disc text-xs text-[var(--foreground)]">
          {health.catalogTrustReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <div className="mt-3 grid gap-1 text-xs text-[var(--foreground)] sm:grid-cols-2">
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
        <p className="mt-3 text-xs text-[var(--muted)]">
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
        <p className="mt-1 text-[var(--foreground)]">
          <span className="font-mono">{health.shopVisibleCount}</span> visible (
          <span className="font-mono">{health.syncedShopVisibleCount}</span> with SPOD-linked variants or external id) ·{" "}
          {health.totalProducts} total · {health.archivedCount} archived · {health.inactiveCount} inactive
        </p>
        {health.emptyDiagnosis ? <p className="mt-2 text-[var(--foreground)]">{health.emptyDiagnosis}</p> : null}
        <p className="mt-2 text-xs text-[var(--muted)]">
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
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
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
