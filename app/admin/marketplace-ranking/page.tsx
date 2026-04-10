import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import MarketplaceRankAdmin from "@/components/admin/marketplace-rank-admin";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Ranking weights",
  "/admin/marketplace-ranking",
  "Studio ranking weights and boosts (internal).",
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Ranking (internal)</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Studio ranking weights</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Adjust <strong>rank weight</strong> per approved studio for internal ordering. This does not change today’s
        studio-first public navigation while public browsing stays off. Featured products still sort ahead within the same
        studio bucket.
      </p>

      <div className="mt-8">
        {studios.length ? (
          <MarketplaceRankAdmin initial={studios} />
        ) : (
          <p className="text-sm text-stone-600">No live studios yet.</p>
        )}
      </div>
    </div>
  );
}
