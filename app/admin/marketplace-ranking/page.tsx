import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import MarketplaceRankAdmin from "@/components/admin/marketplace-rank-admin";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Discovery ranking (dormant)",
  "/admin/marketplace-ranking",
  "Dormant studio ranking weights and boosts.",
);

export const dynamic = "force-dynamic";

export default async function AdminMarketplaceRankingPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const studios = await prisma.studio.findMany({
    where: { status: "approved" },
    orderBy: [{ marketplaceRankWeight: "desc" }, { displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      city: true,
      country: true,
      status: true,
      marketplaceRankWeight: true,
    },
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Discovery (dormant)</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Discovery ranking</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Adjust <strong>rank weight</strong> per approved studio for dormant discovery ordering controls. This does not
        affect the current studio-website-first public navigation while discovery remains disabled.
        Featured products still sort ahead within the same studio
        bucket.
      </p>

      <div className="mt-8">
        {studios.length ? (
          <MarketplaceRankAdmin initial={studios} />
        ) : (
          <p className="text-sm text-stone-600">No approved studios yet.</p>
        )}
      </div>
    </div>
  );
}
