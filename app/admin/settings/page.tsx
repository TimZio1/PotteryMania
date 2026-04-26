import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { WearRetailPricingForm } from "@/components/admin/wear-retail-pricing-form";
import { resolveWearInternalPricingConfig } from "@/lib/wear-internal-pricing";
import { isApparelAdminMode } from "@/lib/launch-mode";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Settings",
  "/admin/settings",
  "Platform settings and related admin tools.",
);

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const apparelAdmin = isApparelAdminMode();
  const retailPricing = await resolveWearInternalPricingConfig();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {apparelAdmin ? "Apparel settings" : "Settings"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        Apparel pricing control
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Set the markup PotteryMania applies on top of the Spreadconnect base cost for T-shirts and hoodies.
      </p>

      <div className="mt-8">
        <WearRetailPricingForm initial={retailPricing} />
      </div>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Need affiliate commission rules?{" "}
        <Link href="/admin/affiliates" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Open affiliates
        </Link>
        .
      </p>
    </div>
  );
}
