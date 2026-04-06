import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import WearProductsAdminClient from "@/components/admin/wear-products-admin-client";

export const dynamic = "force-dynamic";

function ListFallback() {
  return <p className="mt-8 text-sm text-stone-500">Loading…</p>;
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

  const initial = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    isActive: r.isActive,
    isFeatured: r.isFeatured,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    priceCents: r.priceCents,
    currency: r.currency,
    variantCount: r._count.variants,
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Wear products</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Catalog for the PotteryMania-native wear storefront. Archive removes pieces from the public shop without deleting
        order history. Variants drive size/color SKUs and optional per-option pricing.
      </p>
      <Suspense fallback={<ListFallback />}>
        <WearProductsAdminClient initial={initial} />
      </Suspense>
    </div>
  );
}
