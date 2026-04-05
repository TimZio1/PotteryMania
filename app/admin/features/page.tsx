import Link from "next/link";
import { redirect } from "next/navigation";
import {
  featureActivationAdminAuditDailySeries,
  featureActivationEventLedgerDailySeries,
  featureActivationLifecycleDailySeries,
  featureAnalyticsSnapshot,
  parseFeatureAnalyticsInactiveDays,
} from "@/lib/admin-feature-analytics";
import { featureActivationDirectory, featureHubStats } from "@/lib/admin-feature-hub-stats";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { TimeSeriesChart } from "@/components/admin/time-series-chart";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminFeaturesHubPage({ searchParams }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const featureIdRaw = typeof sp.featureId === "string" ? sp.featureId.trim() : "";
  const tab = typeof sp.tab === "string" && sp.tab === "analytics" ? "analytics" : "overview";
  const inactiveDays = parseFeatureAnalyticsInactiveDays(
    typeof sp.inactiveDays === "string" ? sp.inactiveDays : undefined,
  );

  const directoryPromise = featureIdRaw ? featureActivationDirectory(prisma, featureIdRaw) : Promise.resolve(null);

  if (tab === "analytics") {
    const analyticsFeatureSlug =
      featureIdRaw.length > 0
        ? (
            await prisma.platformFeature.findUnique({
              where: { id: featureIdRaw },
              select: { slug: true },
            })
          )?.slug ?? null
        : null;

    const [catalogCount, analytics, auditSeries, lifecycleSeries, ledgerSeries, directoryResult] =
      await Promise.all([
        prisma.platformFeature.count(),
        featureAnalyticsSnapshot(prisma, { inactiveWindowDays: inactiveDays }),
        featureActivationAdminAuditDailySeries(prisma, {
          windowDays: inactiveDays,
          featureSlug: analyticsFeatureSlug,
        }),
        featureActivationLifecycleDailySeries(prisma, {
          windowDays: inactiveDays,
          featureId: featureIdRaw.length > 0 ? featureIdRaw : null,
        }),
        featureActivationEventLedgerDailySeries(prisma, {
          windowDays: inactiveDays,
          featureId: featureIdRaw.length > 0 ? featureIdRaw : null,
        }),
        directoryPromise,
      ]);

    const { approvedStudioCount, rows: aRows, totals, inactiveWindowDays } = analytics;

    const eur = (c: number) =>
      new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(c / 100);

    const unknownFeature = featureIdRaw.length > 0 && directoryResult !== null && !directoryResult.ok;

    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Monetization</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Feature control hub</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Analytics tab: activation status mix per SKU, Stripe-backed rows, and studios that moved to{" "}
          <strong>inactive</strong> in the last {inactiveWindowDays} days (directional churn / preference signal — not a
          full cohort model).
        </p>

        <TabBar tab={tab} featureId={featureIdRaw} inactiveDays={inactiveDays} />

        <CrossLinks />

        <InactiveWindowPills current={inactiveDays} featureId={featureIdRaw} />

        <FeatureDirectoryForm tab={tab} featureIdRaw={featureIdRaw} inactiveDays={inactiveDays} rowOptions={aRows} />

        {unknownFeature ? <UnknownFeatureNote /> : null}

        <DirectorySection directoryResult={directoryResult} eur={eur} />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Catalog features" value={String(catalogCount)} hint="PlatformFeature rows" />
          <StatCard label="Activation rows" value={String(totals.totalActivationRows)} hint="All StudioFeatureActivation" />
          <StatCard label="Stripe-backed rows" value={String(totals.totalStripeBacked)} hint="Has subscription id" />
          <StatCard
            label={`Inactive (≤${inactiveWindowDays}d)`}
            value={String(totals.totalInactiveRecent)}
            hint="Updated while inactive"
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart
            title={`Hyperadmin grants / day (${auditSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "PATCH status → active from studio admin only; filtered to the selected catalog feature."
                : "PATCH status → active from studio admin (excludes vendor checkout and override-only edits)."
            }
            points={auditSeries.grants}
            tone="amber"
          />
          <TimeSeriesChart
            title={`Hyperadmin revokes / day (${auditSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "PATCH status → inactive for the selected SKU."
                : "PATCH status → inactive across all SKUs (audit log)."
            }
            points={auditSeries.revokes}
            tone="rose"
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart
            title={`New activation rows / day (${lifecycleSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "First `StudioFeatureActivation` insert for this SKU (per studio)."
                : "First studio+feature activation row created that day (includes seed/backfill noise on early days)."
            }
            points={lifecycleSeries.rowsCreated}
            tone="emerald"
          />
          <TimeSeriesChart
            title={`Turn-on events / day (${lifecycleSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "`activatedAt` stamped that day — vendor enable, Stripe checkout, or admin grant."
                : "Count of rows whose `activatedAt` falls on that UTC day (vendor, Stripe webhook, admin)."
            }
            points={lifecycleSeries.activatedAtEvents}
            tone="indigo"
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <TimeSeriesChart
            title={`Ledger: Stripe checkouts / day (${ledgerSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "Append-only `studio_feature_activation_events`: checkout_single + checkout_bundle for this SKU. No backfill before deploy."
                : "Recorded when Checkout completes (per feature row). Same session + feature upserts — Stripe webhook retries do not duplicate."
            }
            points={ledgerSeries.stripeCheckouts}
            tone="amber"
          />
          <TimeSeriesChart
            title={`Ledger: subscription ends / day (${ledgerSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "`stripe_subscription_ended` for this SKU — at most one row per Stripe subscription id (deduped across cancel + webhook)."
                : "One event per catalog feature per ended Stripe subscription (bundle → multiple features). Extra writes are dropped safely."
            }
            points={ledgerSeries.stripeSubscriptionEnds}
            tone="rose"
          />
        </div>

        <div className="mt-10">
          <TimeSeriesChart
            title={`Ledger net / day (${ledgerSeries.windowDays}d, UTC)`}
            subtitle={
              featureIdRaw
                ? "Enable-shaped minus disable-shaped events for this SKU (+ vendor_enable, checkouts, admin_active vs vendor_disable, admin_inactive, sub ended). Not cohort retention."
                : "Same formula across all SKUs from the append-only ledger. `admin_override_price` excluded."
            }
            points={ledgerSeries.ledgerNet}
            allowNegative
            tone="amber"
          />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-amber-950">By feature — analytics</h2>
          <p className="mt-1 text-xs text-stone-500">
            Billable = active + trialing + pending_cancel. Est. MRR uses override or list price (same as hub). Adoption %
            is billable ÷ approved studios.
          </p>
          <div className={`${ui.cardMuted} mt-4 max-h-[min(36rem,80vh)] overflow-auto`}>
            <DataTable
              rows={aRows}
              empty="No catalog features."
              columns={[
                {
                  key: "name",
                  header: "Feature",
                  cell: (r) => (
                    <div>
                      <span className="font-medium text-stone-800">{r.name}</span>
                      <p className="font-mono text-[11px] text-stone-500">{r.slug}</p>
                    </div>
                  ),
                },
                {
                  key: "rows",
                  header: "Rows",
                  cell: (r) => <span className="tabular-nums text-sm">{r.totalRows}</span>,
                },
                {
                  key: "st",
                  header: "Active / trial / pend",
                  cell: (r) => (
                    <span className="font-mono text-[11px] text-stone-700">
                      {r.active}/{r.trialing}/{r.pendingCancel}
                    </span>
                  ),
                },
                {
                  key: "in",
                  header: "Inactive",
                  cell: (r) => <span className="tabular-nums text-sm text-stone-700">{r.inactive}</span>,
                },
                {
                  key: "off",
                  header: `Off ≤${inactiveWindowDays}d`,
                  cell: (r) => (
                    <span className="tabular-nums text-sm text-amber-900">{r.inactiveRecentCount}</span>
                  ),
                },
                {
                  key: "stripe",
                  header: "Stripe",
                  cell: (r) => <span className="tabular-nums text-sm">{r.withStripeSubscription}</span>,
                },
                {
                  key: "bill",
                  header: "Billable",
                  cell: (r) => <span className="tabular-nums font-medium text-stone-800">{r.billableActivations}</span>,
                },
                {
                  key: "pct",
                  header: "Adoption",
                  cell: (r) => (
                    <span className="tabular-nums text-stone-700">
                      {approvedStudioCount ? `${r.activationRatePct}%` : "—"}
                    </span>
                  ),
                },
              {
                key: "mrr",
                header: "Est. MRR",
                cell: (r) => <span className="tabular-nums font-medium text-amber-950">{eur(r.estimatedMrrCents)}</span>,
              },
              {
                key: "sku",
                header: "SKU editor",
                cell: (r) => (
                  <Link
                    href={catalogSkuEditorHref(r.id)}
                    className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    Price & flags →
                  </Link>
                ),
              },
              {
                key: "dir",
                header: "Directory",
                cell: (r) => (
                  <Link
                    href={analyticsFeatureQueryHref(r.id, inactiveDays)}
                    className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    Studios →
                  </Link>
                ),
              },
            ]}
            />
          </div>
        </section>
      </div>
    );
  }

  const [catalogCount, hub, directoryResult] = await Promise.all([
    prisma.platformFeature.count(),
    featureHubStats(prisma),
    directoryPromise,
  ]);

  const { approvedStudioCount, rows, totalEstimatedMrrCents, totalBillableActivations } = hub;

  const eur = (c: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(c / 100);

  const unknownFeature = featureIdRaw.length > 0 && directoryResult !== null && !directoryResult.ok;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Monetization</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Feature control hub</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Cross-catalog view of platform add-ons: billable activations (active / trialing / pending_cancel), estimated
        monthly recurring from catalog or override prices, and adoption vs approved studios. Drill into a feature to see
        every studio row and open admin detail for grants and price overrides.
      </p>

      <TabBar tab={tab} featureId={featureIdRaw} inactiveDays={inactiveDays} />

      <CrossLinks />

      <FeatureDirectoryForm tab={tab} featureIdRaw={featureIdRaw} inactiveDays={inactiveDays} rowOptions={rows} />

      {unknownFeature ? <UnknownFeatureNote /> : null}

      <DirectorySection directoryResult={directoryResult} eur={eur} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Catalog features" value={String(catalogCount)} hint="PlatformFeature rows" />
        <StatCard label="Approved studios" value={String(approvedStudioCount)} hint="Denominator for adoption %" />
        <StatCard label="Billable activations" value={String(totalBillableActivations)} hint="Sum across features" />
        <StatCard label="Est. add-on MRR" value={eur(totalEstimatedMrrCents)} hint="Directional; Stripe is source of truth" />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-amber-950">By feature</h2>
        <p className="mt-1 text-xs text-stone-500">
          Inactive catalog rows still listed so you can see zero-adoption SKUs. Use <strong>Studios</strong> to open the
          per-studio directory for that SKU.
        </p>
        <div className={`${ui.cardMuted} mt-4 max-h-[min(32rem,75vh)] overflow-auto`}>
          <DataTable
            rows={rows}
            empty="No catalog features. Seed or create rows under Platform add-ons."
            columns={[
              {
                key: "name",
                header: "Feature",
                cell: (r) => (
                  <div>
                    <span className="font-medium text-stone-800">{r.name}</span>
                    <p className="font-mono text-[11px] text-stone-500">{r.slug}</p>
                  </div>
                ),
              },
              { key: "cat", header: "Category", cell: (r) => <span className="text-sm text-stone-700">{r.category}</span> },
              {
                key: "list",
                header: "List price",
                cell: (r) => eur(r.priceCents),
              },
              {
                key: "on",
                header: "Catalog",
                cell: (r) => (
                  <span className="text-sm">
                    {r.isActive ? (
                      <span className="text-emerald-800">Active</span>
                    ) : (
                      <span className="text-stone-500">Off</span>
                    )}
                    <span className="text-stone-400"> · </span>
                    <code className="text-xs">{r.visibility}</code>
                  </span>
                ),
              },
              {
                key: "act",
                header: "Billable",
                cell: (r) => <span className="tabular-nums text-stone-800">{r.billableActivations}</span>,
              },
              {
                key: "pct",
                header: "Adoption",
                cell: (r) => (
                  <span className="tabular-nums text-stone-700">
                    {approvedStudioCount ? `${r.activationRatePct}%` : "—"}
                  </span>
                ),
              },
              {
                key: "mrr",
                header: "Est. MRR",
                cell: (r) => <span className="tabular-nums font-medium text-amber-950">{eur(r.estimatedMrrCents)}</span>,
              },
              {
                key: "sku",
                header: "SKU editor",
                cell: (r) => (
                  <Link
                    href={catalogSkuEditorHref(r.id)}
                    className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    Price & flags →
                  </Link>
                ),
              },
              {
                key: "dir",
                header: "Directory",
                cell: (r) => (
                  <Link
                    href={`/admin/features?featureId=${r.id}`}
                    className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    Studios →
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function analyticsFeatureQueryHref(featureId: string, inactiveDays: number) {
  const p = new URLSearchParams({ tab: "analytics", featureId });
  if (inactiveDays !== 30) p.set("inactiveDays", String(inactiveDays));
  return `/admin/features?${p}`;
}

function catalogSkuEditorHref(featureId: string) {
  return `/admin/platform-features#catalog-feature-${featureId}`;
}

function TabBar({
  tab,
  featureId,
  inactiveDays,
}: {
  tab: "overview" | "analytics";
  featureId: string;
  inactiveDays: number;
}) {
  const overviewParams = new URLSearchParams();
  if (featureId) overviewParams.set("featureId", featureId);
  const overviewHref = overviewParams.toString() ? `/admin/features?${overviewParams}` : "/admin/features";

  const analyticsParams = new URLSearchParams({ tab: "analytics" });
  if (inactiveDays !== 30) analyticsParams.set("inactiveDays", String(inactiveDays));
  if (featureId) analyticsParams.set("featureId", featureId);
  const analyticsHref = `/admin/features?${analyticsParams}`;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Link
        href={overviewHref}
        className={cn(
          ui.buttonSecondary,
          "min-h-10 px-4 text-sm",
          tab === "overview" ? "ring-2 ring-amber-400/80" : "",
        )}
      >
        Overview
      </Link>
      <Link
        href={analyticsHref}
        className={cn(
          ui.buttonSecondary,
          "min-h-10 px-4 text-sm",
          tab === "analytics" ? "ring-2 ring-amber-400/80" : "",
        )}
      >
        Analytics
      </Link>
    </div>
  );
}

function InactiveWindowPills({ current, featureId }: { current: number; featureId: string }) {
  const opts = [7, 30, 90] as const;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
      <span className="text-xs font-medium text-stone-600">Recent inactive window:</span>
      {opts.map((d) => {
        const p = new URLSearchParams({ tab: "analytics", inactiveDays: String(d) });
        if (featureId) p.set("featureId", featureId);
        const href = `/admin/features?${p}`;
        return (
          <Link
            key={d}
            href={href}
            className={cn(
              ui.buttonGhost,
              "min-h-9 px-3 text-xs tabular-nums",
              d === current ? "ring-2 ring-amber-400/90" : "",
            )}
          >
            {d}d
          </Link>
        );
      })}
      <a
        href={`/api/admin/feature-analytics/export?inactiveDays=${current}`}
        className={cn(ui.buttonSecondary, "min-h-9 px-3 text-xs font-medium")}
      >
        Snapshot CSV
      </a>
      <a
        href={
          featureId
            ? `/api/admin/feature-activation-events/export?inactiveDays=${current}&featureId=${encodeURIComponent(featureId)}`
            : `/api/admin/feature-activation-events/export?inactiveDays=${current}`
        }
        className={cn(ui.buttonSecondary, "min-h-9 px-3 text-xs font-medium")}
      >
        Events CSV
      </a>
    </div>
  );
}

function CrossLinks() {
  return (
    <p className="mt-4 text-sm">
      <Link href="/admin/platform-features" className="font-medium text-amber-900 underline-offset-2 hover:underline">
        Open add-on catalog (create / PATCH rows) →
      </Link>
      <span className="mx-2 text-stone-300">·</span>
      <Link href="/admin/feature-bundles" className="font-medium text-amber-900 underline-offset-2 hover:underline">
        Feature bundles →
      </Link>
      <span className="mx-2 text-stone-300">·</span>
      <Link href="/admin/revenue?tab=breakdown" className="font-medium text-amber-900 underline-offset-2 hover:underline">
        Revenue · Breakdown (same MRR basis) →
      </Link>
    </p>
  );
}

type DirOption = { id: string; name: string; slug: string };

function FeatureDirectoryForm({
  tab,
  featureIdRaw,
  inactiveDays,
  rowOptions,
}: {
  tab: "overview" | "analytics";
  featureIdRaw: string;
  inactiveDays: number;
  rowOptions: DirOption[];
}) {
  const clearParams = new URLSearchParams();
  if (tab === "analytics") clearParams.set("tab", "analytics");
  if (tab === "analytics" && inactiveDays !== 30) clearParams.set("inactiveDays", String(inactiveDays));
  const clearHref =
    clearParams.toString().length > 0 ? `/admin/features?${clearParams}` : "/admin/features";

  return (
    <form method="get" className={`${ui.cardMuted} mt-6 flex flex-wrap items-end gap-4`}>
      {tab === "analytics" ? <input type="hidden" name="tab" value="analytics" /> : null}
      {tab === "analytics" ? <input type="hidden" name="inactiveDays" value={String(inactiveDays)} /> : null}
      <div className="min-w-56 flex-1">
        <label className={ui.label} htmlFor="feature-hub-jump">
          View activations by feature
        </label>
        <select
          id="feature-hub-jump"
          name="featureId"
          className={`${ui.input} mt-1`}
          defaultValue={featureIdRaw}
        >
          <option value="">— Select a catalog feature —</option>
          {rowOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.slug})
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={ui.buttonSecondary}>
        Load studios
      </button>
      {featureIdRaw ? (
        <Link href={clearHref} className={`${ui.buttonGhost} text-sm`}>
          Clear filter
        </Link>
      ) : null}
    </form>
  );
}

function UnknownFeatureNote() {
  return (
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      No catalog feature matches this id. Choose a feature from the list above.
    </p>
  );
}

function DirectorySection({
  directoryResult,
  eur,
}: {
  directoryResult: Awaited<ReturnType<typeof featureActivationDirectory>> | null;
  eur: (c: number) => string;
}) {
  if (!directoryResult?.ok) return null;
  return (
    <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-amber-950">Studios — {directoryResult.feature.name}</h2>
      <p className="mt-1 font-mono text-xs text-stone-500">{directoryResult.feature.slug}</p>
      <p className="mt-2 text-xs text-stone-500">
        List price {eur(directoryResult.feature.priceCents)}. All activation statuses; use studio admin to grant, revoke,
        or override price.
      </p>
      <div className="mt-4 max-h-[min(28rem,70vh)] overflow-auto">
        <DataTable
          rows={directoryResult.rows}
          empty="No activation rows for this feature yet."
          columns={[
            {
              key: "st",
              header: "Studio",
              cell: (r) => (
                <div>
                  <Link
                    href={`/admin/studios/${r.studioId}`}
                    className="font-medium text-amber-900 underline-offset-2 hover:underline"
                  >
                    {r.displayName}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {r.city}, {r.country} · <code className="text-[11px]">{r.studioStatus}</code>
                  </p>
                </div>
              ),
            },
            {
              key: "act",
              header: "Activation",
              cell: (r) => <code className="text-xs">{r.activationStatus}</code>,
            },
            {
              key: "ov",
              header: "Override",
              cell: (r) =>
                r.overridePriceCents != null ? (
                  <span className="tabular-nums text-sm">{eur(r.overridePriceCents)}</span>
                ) : (
                  <span className="text-sm text-stone-400">—</span>
                ),
            },
            {
              key: "eff",
              header: "Effective / mo",
              cell: (r) => (
                <span className="tabular-nums text-sm font-medium text-stone-800">{eur(r.effectivePriceCents)}</span>
              ),
            },
            {
              key: "sub",
              header: "Stripe sub",
              cell: (r) =>
                r.stripeSubscriptionId ? (
                  <span className="font-mono text-[11px] text-stone-600">{r.stripeSubscriptionId}</span>
                ) : (
                  <span className="text-stone-400">—</span>
                ),
            },
            {
              key: "up",
              header: "Updated",
              cell: (r) => (
                <span className="text-xs text-stone-500">
                  {r.updatedAt.toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}
