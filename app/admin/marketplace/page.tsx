import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import MarketplaceControlsClient from "@/components/admin/marketplace-controls-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Discovery admin (dormant)",
  "/admin/marketplace",
  "Dormant discovery controls and merchandising tools.",
);

export const dynamic = "force-dynamic";

export default async function AdminMarketplacePage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Discovery (dormant)</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Discovery controls</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        These controls are currently dormant for the public product. Featured placements and ranking boosts are preserved
        for future reactivation. Per-studio <strong>rank weight</strong> still lives on{" "}
        <Link href="/admin/marketplace-ranking" className="font-medium text-amber-900 underline">
          Discovery ranking
        </Link>
        .
      </p>

      <div className="mt-8">
        <MarketplaceControlsClient />
      </div>
    </div>
  );
}
