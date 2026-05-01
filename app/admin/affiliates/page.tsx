import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { metaAdminPage } from "@/lib/seo-routes";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";
import { formatWearMoney } from "@/lib/wear-money";
import { AffiliateAdminClient, type AdminAffiliateRow } from "@/components/admin/affiliate-admin-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = metaAdminPage(
  "Affiliates",
  "/admin/affiliates",
  "Manage PotteryMania apparel affiliate codes, rates, sales, and commission.",
);

const PAID_STATUSES = ["paid", "in_production", "fulfilled", "shipped"] as const;

export default async function AdminAffiliatesPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [configs, orders] = await Promise.all([
    prisma.studioWearConfig.findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      include: {
        studio: {
          select: {
            id: true,
            displayName: true,
            email: true,
            owner: { select: { email: true } },
            stripeAccount: {
              select: {
                onboardingStatus: true,
                payoutsEnabled: true,
                detailsSubmitted: true,
              },
            },
          },
        },
      },
    }),
    prisma.wearOrder.findMany({
      where: { studioId: { not: null }, status: { in: [...PAID_STATUSES] } },
      select: {
        studioId: true,
        subtotalCents: true,
        amountTotalCents: true,
        studioMarginCents: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [creditStats, payoutStats] = await Promise.all([
    prisma.affiliateCommissionCredit.groupBy({
      by: ["studioId", "status"],
      _sum: { amountCents: true },
    }),
    prisma.affiliatePayout.groupBy({
      by: ["studioId", "status"],
      _sum: { amountCents: true },
    }),
  ]);

  const stats = new Map<
    string,
    { salesCount: number; revenueCents: number; commissionCents: number; lastSaleAt: Date | null }
  >();
  for (const order of orders) {
    if (!order.studioId) continue;
    const prev = stats.get(order.studioId) ?? {
      salesCount: 0,
      revenueCents: 0,
      commissionCents: 0,
      lastSaleAt: null,
    };
    stats.set(order.studioId, {
      salesCount: prev.salesCount + 1,
      revenueCents: prev.revenueCents + (order.amountTotalCents ?? order.subtotalCents),
      commissionCents: prev.commissionCents + (order.studioMarginCents ?? 0),
      lastSaleAt: prev.lastSaleAt && prev.lastSaleAt > order.createdAt ? prev.lastSaleAt : order.createdAt,
    });
  }

  const payoutByStudio = new Map<
    string,
    { pendingCents: number; paidCents: number; failedCents: number }
  >();
  for (const group of creditStats) {
    const current = payoutByStudio.get(group.studioId) ?? { pendingCents: 0, paidCents: 0, failedCents: 0 };
    const amount = group._sum.amountCents ?? 0;
    if (group.status === "pending" || group.status === "payout_pending") current.pendingCents += amount;
    if (group.status === "paid") current.paidCents += amount;
    payoutByStudio.set(group.studioId, current);
  }
  for (const group of payoutStats) {
    if (group.status !== "failed") continue;
    const current = payoutByStudio.get(group.studioId) ?? { pendingCents: 0, paidCents: 0, failedCents: 0 };
    current.failedCents += group._sum.amountCents ?? 0;
    payoutByStudio.set(group.studioId, current);
  }

  const rows: AdminAffiliateRow[] = configs.map((config) => {
    const rowStats = stats.get(config.studioId) ?? {
      salesCount: 0,
      revenueCents: 0,
      commissionCents: 0,
      lastSaleAt: null,
    };
    const payoutTotals = payoutByStudio.get(config.studioId) ?? {
      pendingCents: 0,
      paidCents: 0,
      failedCents: 0,
    };
    return {
      studioId: config.studioId,
      name: config.studio.displayName,
      email: config.studio.email || config.studio.owner.email,
      code: config.wearAffiliateCode,
      enabled: config.enabled,
      marginPercent: (config.marginBps / 100).toFixed(config.marginBps % 100 === 0 ? 0 : 2),
      salesCount: rowStats.salesCount,
      revenueCents: rowStats.revenueCents,
      commissionCents: rowStats.commissionCents,
      unpaidCommissionCents: payoutTotals.pendingCents,
      paidCommissionCents: payoutTotals.paidCents,
      failedPayoutCents: payoutTotals.failedCents,
      stripeStatus: config.studio.stripeAccount
        ? config.studio.stripeAccount.payoutsEnabled && config.studio.stripeAccount.detailsSubmitted
          ? "ready"
          : config.studio.stripeAccount.onboardingStatus
        : "missing",
      lastSaleAt: rowStats.lastSaleAt?.toISOString() ?? null,
    };
  });

  const activeRows = rows.filter((row) => row.enabled);
  const totalRevenueCents = rows.reduce((sum, row) => sum + row.revenueCents, 0);
  const totalCommissionCents = rows.reduce((sum, row) => sum + row.commissionCents, 0);
  const unpaidCommissionCents = rows.reduce((sum, row) => sum + row.unpaidCommissionCents, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Affiliate program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Apparel affiliates
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Approve partners, create public tracking codes, pause links, adjust commission, and see referred sales.
          </p>
        </div>
        <a
          href="/wear/partner"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-medium text-stone-800 transition hover:border-amber-400"
        >
          View public program
        </a>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Active affiliates" value={String(activeRows.length)} note={`${rows.length} total`} />
        <SummaryCard label="Referred sales" value={String(rows.reduce((sum, row) => sum + row.salesCount, 0))} note="Paid apparel orders" />
        <SummaryCard label="Affiliate revenue" value={formatWearMoney(totalRevenueCents, "EUR")} note="Attributed order value" />
        <SummaryCard label="Commission earned" value={formatWearMoney(totalCommissionCents, "EUR")} note="Post-discount merchandise" tone="emerald" />
        <SummaryCard label="Unpaid balance" value={formatWearMoney(unpaidCommissionCents, "EUR")} note="Pays at €50" tone="emerald" />
      </section>

      <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm leading-7 text-amber-950">
        <p className="font-semibold">Program rules</p>
        <p className="mt-2">
          Public promise: 15% commission, 30-day cookie, automatic Stripe payout when unpaid commission reaches €50.
          Commission is calculated after coupons/discounts and before tax/shipping, then transferred to the affiliate Stripe account. Short links redirect from
          <code className="mx-1 rounded bg-white px-1.5 py-0.5">/w/code</code> to the shop with attribution.
        </p>
      </section>

      <div className="mt-8">
        <AffiliateAdminClient affiliates={rows} siteUrl={resolvePublicSiteUrl()} />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone = "amber",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "amber" | "emerald";
}) {
  return (
    <article className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-600">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${tone === "emerald" ? "text-emerald-800" : "text-amber-950"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-stone-600">{note}</p>
    </article>
  );
}
