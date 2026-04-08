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
  return dashboardStudioMeta(studioId, "Shop", "shop", "Products and storefront management.");
}

export default async function StudioShopPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const { products, orders } = await loadStudioShopPageData(prisma, studioId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Commerce</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Products / Shop</h1>
        <p className="mt-2 text-sm text-stone-600">
          Inventory quick edits, low-stock cues, and order fulfillment in one place. Deep editing stays in the product workspace.
        </p>
      </div>

      <StudioShopClient studioId={studioId} products={products} orders={orders} />
    </div>
  );
}
