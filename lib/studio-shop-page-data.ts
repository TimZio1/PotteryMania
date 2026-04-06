import type { PrismaClient } from "@prisma/client";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StudioShopProductRow = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  status: string;
  priceCents: number;
  salePriceCents: number | null;
  sku: string | null;
  stockQuantity: number;
  stockStatus: string;
  isLowStock: boolean;
};

export type StudioShopOrderRow = {
  id: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalCents: number;
  shippingMethod: string | null;
  items: { title: string; quantity: number }[];
};

export async function loadStudioShopPageData(prisma: PrismaClient, studioId: string) {
  const [products, orders] = await Promise.all([
    prisma.product.findMany({
      where: { studioId, status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        status: true,
        priceCents: true,
        salePriceCents: true,
        sku: true,
        stockQuantity: true,
        stockStatus: true,
      },
    }),
    prisma.order.findMany({
      where: {
        items: { some: { vendorId: studioId, itemType: "product" } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          where: { vendorId: studioId },
          include: { product: { select: { title: true } } },
        },
      },
      take: 100,
    }),
  ]);

  const productRows: StudioShopProductRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription,
    status: p.status,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents,
    sku: p.sku,
    stockQuantity: p.stockQuantity,
    stockStatus: p.stockStatus,
    isLowStock: p.stockQuantity > 0 && p.stockQuantity <= DEFAULT_LOW_STOCK_THRESHOLD,
  }));

  const orderRows: StudioShopOrderRow[] = orders.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    totalCents: o.totalCents,
    shippingMethod: o.shippingMethod,
    items: o.items.map((it) => ({
      title: it.product?.title ?? "Product",
      quantity: it.quantity,
    })),
  }));

  return { products: productRows, orders: orderRows };
}
