import type { Prisma, PrismaClient } from "@prisma/client";
import { ceramicCategoryMetaByValue } from "@/lib/ceramic-categories";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StudioShopProductRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  shortDescription: string | null;
  status: string;
  priceCents: number;
  salePriceCents: number | null;
  pricingType: "one_time" | "recurring";
  recurringPriceCents: number | null;
  billingInterval: "weekly" | "monthly" | "custom" | null;
  billingIntervalCount: number | null;
  minimumCommitmentCycles: number | null;
  autoRenew: boolean;
  trialPeriodDays: number | null;
  cancellationPolicyText: string | null;
  gracePeriodDays: number;
  paymentRetryMax: number;
  failedPaymentAction: "pause" | "cancel";
  sku: string | null;
  shippingDomesticCents: number | null;
  shippingEuropeCents: number | null;
  shippingUsaCents: number | null;
  shippingCanadaCents: number | null;
  shippingAsiaCents: number | null;
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

type StudioShopProductRecord = Prisma.ProductGetPayload<{
  select: {
    id: true;
    title: true;
    slug: true;
    subcategory: true;
    shortDescription: true;
    status: true;
    priceCents: true;
    salePriceCents: true;
    pricingType: true;
    recurringPriceCents: true;
    billingInterval: true;
    billingIntervalCount: true;
    minimumCommitmentCycles: true;
    autoRenew: true;
    trialPeriodDays: true;
    cancellationPolicyText: true;
    gracePeriodDays: true;
    paymentRetryMax: true;
    failedPaymentAction: true;
    sku: true;
    shippingDomesticCents: true;
    shippingEuropeCents: true;
    shippingUsaCents: true;
    shippingCanadaCents: true;
    shippingAsiaCents: true;
    stockQuantity: true;
    stockStatus: true;
    categoryMeta: {
      select: {
        slug: true;
        name: true;
      };
    };
  };
}>;

type StudioShopOrderRecord = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: {
            title: true;
          };
        };
      };
    };
  };
}>;

export async function loadStudioShopPageData(prisma: PrismaClient, studioId: string) {
  let products: StudioShopProductRecord[] = [];
  let orders: StudioShopOrderRecord[] = [];
  try {
    [products, orders] = await Promise.all([
      prisma.product.findMany({
        where: { studioId, status: { not: "archived" } },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          subcategory: true,
          shortDescription: true,
          status: true,
          priceCents: true,
          salePriceCents: true,
          pricingType: true,
          recurringPriceCents: true,
          billingInterval: true,
          billingIntervalCount: true,
          minimumCommitmentCycles: true,
          autoRenew: true,
          trialPeriodDays: true,
          cancellationPolicyText: true,
          gracePeriodDays: true,
          paymentRetryMax: true,
          failedPaymentAction: true,
          sku: true,
          shippingDomesticCents: true,
          shippingEuropeCents: true,
          shippingUsaCents: true,
          shippingCanadaCents: true,
          shippingAsiaCents: true,
          stockQuantity: true,
          stockStatus: true,
          categoryMeta: {
            select: {
              slug: true,
              name: true,
            },
          },
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
  } catch {
    return { products: [] satisfies StudioShopProductRow[], orders: [] satisfies StudioShopOrderRow[], unavailable: true };
  }

  const productRows: StudioShopProductRow[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.categoryMeta?.slug ?? "tableware",
    categoryLabel: p.categoryMeta?.name ?? ceramicCategoryMetaByValue("tableware").title,
    subcategory: p.subcategory,
    shortDescription: p.shortDescription,
    status: p.status,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents,
    pricingType: p.pricingType,
    recurringPriceCents: p.recurringPriceCents,
    billingInterval: p.billingInterval,
    billingIntervalCount: p.billingIntervalCount,
    minimumCommitmentCycles: p.minimumCommitmentCycles,
    autoRenew: p.autoRenew,
    trialPeriodDays: p.trialPeriodDays,
    cancellationPolicyText: p.cancellationPolicyText,
    gracePeriodDays: p.gracePeriodDays,
    paymentRetryMax: p.paymentRetryMax,
    failedPaymentAction: p.failedPaymentAction,
    sku: p.sku,
    shippingDomesticCents: p.shippingDomesticCents,
    shippingEuropeCents: p.shippingEuropeCents,
    shippingUsaCents: p.shippingUsaCents,
    shippingCanadaCents: p.shippingCanadaCents,
    shippingAsiaCents: p.shippingAsiaCents,
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

  return { products: productRows, orders: orderRows, unavailable: false };
}
