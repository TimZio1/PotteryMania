import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { loadStudioShopPageData } from "@/lib/studio-shop-page-data";
import StudioShopClient from "@/components/dashboard/studio-shop-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Products", "commerce/catalog", "Add products, set prices, and update stock.");
}

export default async function StudioCommerceCatalogPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const { products, orders, unavailable } = await loadStudioShopPageData(prisma, studioId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Shop</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Products</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Add products, update stock, and flag what&apos;s running low.
        </p>
      </div>

      {unavailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Your products are briefly unavailable while a recent change finishes saving. Nothing is lost — refresh in a moment.
        </div>
      ) : null}

      <StudioShopClient studioId={studioId} products={products} orders={orders} initialTab="products" />
    </div>
  );
}
