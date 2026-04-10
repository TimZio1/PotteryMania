import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import MarketplaceControlsClient from "@/components/admin/marketplace-controls-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Public browse (off)",
  "/admin/marketplace",
  "Internal merchandising and placement tools while public browsing is off.",
);

export const dynamic = "force-dynamic";

export default async function AdminMarketplacePage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Public browse (off)</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Browse controls</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        These settings take effect when wider public browsing is enabled again. Featured placements and ranking boosts stay
        available for ops. Per-studio <strong>rank weight</strong> is edited on{" "}
        <Link href="/admin/marketplace-ranking" className="font-medium text-amber-900 underline">
          Ranking weights
        </Link>
        .
      </p>

      <div className="mt-8">
        <MarketplaceControlsClient />
      </div>
    </div>
  );
}
