import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { WearProductCostMarkupTable } from "@/components/admin/wear-product-cost-markup-table";
import { WearRetailPricingForm } from "@/components/admin/wear-retail-pricing-form";
import { resolveWearGlobalPricing } from "@/lib/wear-commission";
import { resolveWearInternalPricingConfig, shouldUseInternalWearPricing } from "@/lib/wear-internal-pricing";
import { getWearSpreadconnectTypePricingStats } from "@/lib/wear-spreadconnect-type-stats";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Wear pricing",
  "/admin/wear-pricing",
  "Spreadconnect type markups, per-product overrides, platform margin, and shelf previews for the apparel store.",
);

export const dynamic = "force-dynamic";

export default async function AdminWearPricingPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [retailPricing, globalPricing, productPricingRows, spreadconnectTypeStats] = await Promise.all([
    resolveWearInternalPricingConfig(),
    resolveWearGlobalPricing(),
    prisma.wearProduct.findMany({
      where: { archivedAt: null },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        supplyCostCents: true,
        internalMarkupPercent: true,
        spreadconnectProductTypeName: true,
        spreadconnectArticleId: true,
        externalFulfillmentId: true,
      },
    }),
    getWearSpreadconnectTypePricingStats(),
  ]);
  const internalPricingOn = shouldUseInternalWearPricing();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Apparel</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Wear pricing &amp; markup</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Wholesale comes from Spreadconnect sync (blank + print). Set markups by <strong>product type</strong>, optional
        per-product overrides, direct-checkout platform margin, and affiliate min/max. Changes apply to the live shop after
        save.
      </p>
      <p className="mt-3 text-sm text-[var(--muted)]">
        <Link href="/admin/affiliates" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Affiliates
        </Link>{" "}
        for partner approvals and codes.
      </p>

      <div className="mt-8 space-y-10">
        <WearRetailPricingForm
          key={[...spreadconnectTypeStats.map((s) => s.key)].sort().join("|")}
          initial={retailPricing}
          spreadconnectTypeStats={spreadconnectTypeStats}
          globalPricing={globalPricing}
          internalPricingOn={internalPricingOn}
        />
        <WearProductCostMarkupTable
          key={productPricingRows.map((r) => r.id).join(",")}
          initial={productPricingRows}
          defaultMarginBps={globalPricing.defaultMarginBps}
          internalPricingOn={internalPricingOn}
        />
      </div>
    </div>
  );
}
