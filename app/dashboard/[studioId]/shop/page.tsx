import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioShopPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [productCount, orderCount] = await Promise.all([
    prisma.product.count({ where: { studioId, status: { not: "archived" } } }),
    prisma.order.count({
      where: { paymentStatus: "paid", items: { some: { vendorId: studioId } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className={ui.overline}>Commerce</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Products / Shop</h1>
        <p className="mt-2 text-sm text-stone-600">
          {productCount} active products · {orderCount} paid orders (all time).
        </p>
      </div>
      <div className={`${ui.card} space-y-4`}>
        <p className="text-sm text-stone-600">
          Manage catalog, images, and inventory in the product workspace. Orders stay linked to your studio.
        </p>
        <Link href={`/dashboard/products/${studioId}`} className={`${ui.buttonPrimary} block text-center`}>
          Open product & inventory workspace
        </Link>
        <Link href={`/dashboard/orders/${studioId}`} className={`${ui.buttonSecondary} block text-center`}>
          View orders
        </Link>
      </div>
    </div>
  );
}
