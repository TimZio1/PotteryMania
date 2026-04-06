/**
 * Push paid native wear orders to Spreadconnect for fulfilment.
 * Requires line-level Spreadconnect SKUs on variants (`sku`) or, for products without variants,
 * `WearProduct.externalFulfillmentId` set to the Spreadconnect article variant SKU.
 */
import type Stripe from "stripe";
import { prisma } from "@/lib/db";

import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";

/**
 * Resolve ship-to for Spreadconnect from a completed Checkout Session.
 * Tries: collected shipping → legacy shipping_details → customer_details.address (last resort for some API shapes).
 */
function checkoutShippingDetails(
  session: Stripe.Checkout.Session,
  fallbackName: string,
): { name: string; address: Stripe.Address } | null {
  const nameFromCustomer =
    session.customer_details?.name?.trim() ||
    session.customer_details?.individual_name?.trim() ||
    session.customer_details?.business_name?.trim() ||
    fallbackName.trim() ||
    "Customer";

  const fromCollected = session.collected_information?.shipping_details;
  if (fromCollected?.address?.line1 && fromCollected.address.country) {
    const name = fromCollected.name?.trim() || nameFromCustomer;
    return { name, address: fromCollected.address };
  }

  const legacy = (
    session as unknown as {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    }
  ).shipping_details;
  if (legacy?.address?.line1 && legacy.address.country) {
    const name = legacy.name?.trim() || nameFromCustomer;
    return { name, address: legacy.address };
  }

  const cd = session.customer_details;
  if (cd?.address?.line1 && cd.address.country) {
    return { name: nameFromCustomer, address: cd.address };
  }

  return null;
}

const SUBMITTED_KIND = "wear_spreadconnect_submitted";
const FAILED_KIND = "wear_spreadconnect_failed";

const EU_VAT = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

function customerTaxTypeForCountry(country: string | undefined): "VAT" | "SALESTAX" | "NOT_TAXABLE" {
  if (!country) return "VAT";
  const c = country.toUpperCase();
  if (EU_VAT.has(c)) return "VAT";
  if (c === "US") return "SALESTAX";
  return "VAT";
}

function splitName(full: string): { firstName: string; lastName: string } {
  const t = full.trim() || "Customer";
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "-" };
  const last = t.slice(i + 1).trim();
  return { firstName: t.slice(0, i).trim() || "Customer", lastName: last || "-" };
}

type ScAddress = {
  company?: string;
  firstName: string;
  lastName: string;
  street: string;
  streetAnnex?: string;
  city: string;
  country: string;
  state: string;
  zipCode: string;
};

function toSpreadconnectAddress(
  nameSource: string,
  line1: string,
  line2: string | null | undefined,
  city: string,
  state: string | null | undefined,
  postal: string,
  country: string,
): ScAddress {
  const { firstName, lastName } = splitName(nameSource);
  return {
    firstName,
    lastName,
    street: line1 || "—",
    ...(line2 ? { streetAnnex: line2 } : {}),
    city: city || "—",
    country: (country || "DE").toUpperCase(),
    state: (state || "").trim() || "—",
    zipCode: postal || "—",
  };
}

export function resolveSpreadconnectSku(item: {
  wearProductVariantId: string | null;
  wearProductVariant: { sku: string | null } | null;
  wearProduct: { externalFulfillmentId: string | null };
}): string | null {
  const vSku = item.wearProductVariant?.sku?.trim();
  if (vSku) return vSku;
  if (!item.wearProductVariantId && item.wearProduct?.externalFulfillmentId?.trim()) {
    return item.wearProduct.externalFulfillmentId.trim();
  }
  return null;
}

type CreateOrderPayload = {
  orderItems: {
    sku: string;
    quantity: number;
    externalOrderItemReference: string;
    customerPrice: { amount: number; currency: string };
  }[];
  shipping: {
    address: ScAddress;
    fromAddress: ScAddress;
    preferredType: string;
    customerPrice: { amount: number; currency: string };
  };
  phone: string;
  email: string;
  externalOrderReference: string;
  externalOrderName: string;
  state: "NEW" | "CONFIRMED";
  customerTaxType: "SALESTAX" | "VAT" | "NOT_TAXABLE";
};

async function postSpreadconnectOrder(
  cfg: NonNullable<ReturnType<typeof getSpreadconnectConfig>>,
  body: CreateOrderPayload,
): Promise<{ ok: true; orderReference: number; rawId: number } | { ok: false; status: number; message: string }> {
  const res = await fetch(`${cfg.baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SPOD-ACCESS-TOKEN": cfg.apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: { id?: number; orderReference?: number; message?: string; errors?: unknown } = {};
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: json.message ?? (text.slice(0, 500) || res.statusText || "request failed"),
    };
  }

  const id = typeof json.id === "number" ? json.id : 0;
  const orderReference = typeof json.orderReference === "number" ? json.orderReference : id;
  return { ok: true, orderReference, rawId: id };
}

/**
 * Called after a wear order is marked paid (Stripe webhook or admin).
 * No-ops when Spreadconnect is not configured. Never throws — logs and records analytics on failure.
 */
export async function submitPaidWearOrderToSpreadconnect(opts: {
  wearOrderId: string;
  stripeSession: Stripe.Checkout.Session;
}): Promise<void> {
  const cfg = getSpreadconnectConfig();
  if (!cfg) return;

  const dup = await prisma.wearAnalyticsEvent.findFirst({
    where: { orderId: opts.wearOrderId, kind: SUBMITTED_KIND },
  });
  if (dup) return;

  const orderRow = await prisma.wearOrder.findUnique({
    where: { id: opts.wearOrderId },
    include: {
      items: {
        include: {
          wearProduct: { select: { externalFulfillmentId: true } },
          wearProductVariant: { select: { sku: true } },
        },
      },
    },
  });

  if (!orderRow || orderRow.status !== "paid") return;

  if (orderRow.externalFulfillmentRef?.startsWith("sc:")) return;

  const session = opts.stripeSession;
  const shippingDetails = checkoutShippingDetails(session, orderRow.customerName);
  const addr = shippingDetails?.address;
  if (!shippingDetails || !addr?.line1 || !addr.country) {
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: FAILED_KIND,
        orderId: opts.wearOrderId,
        payload: {
          reason: "missing_stripe_shipping",
          sessionId: session.id,
        },
      },
    });
    console.error("[spreadconnect] wear order missing shipping on Stripe session", opts.wearOrderId);
    return;
  }

  const shipName = shippingDetails.name.trim() || orderRow.customerName;
  const scAddr = toSpreadconnectAddress(
    shipName,
    addr.line1,
    addr.line2,
    addr.city ?? "",
    addr.state,
    addr.postal_code ?? "",
    addr.country,
  );

  const currency = (session.currency || orderRow.currency || "eur").toUpperCase();
  const shippingCents =
    typeof session.shipping_cost?.amount_total === "number" ? session.shipping_cost.amount_total : 900;
  const shippingAmount = Math.max(0, shippingCents) / 100;

  const phone =
    session.customer_details?.phone?.trim() ||
    process.env.SPREADCONNECT_FALLBACK_PHONE?.trim() ||
    "+0000000000";

  const orderItems: CreateOrderPayload["orderItems"] = [];
  for (const it of orderRow.items) {
    const sku = resolveSpreadconnectSku(it);
    if (!sku) {
      await prisma.wearAnalyticsEvent.create({
        data: {
          kind: FAILED_KIND,
          orderId: opts.wearOrderId,
          payload: {
            reason: "missing_spreadconnect_sku",
            wearOrderItemId: it.id,
            productNameSnapshot: it.productNameSnapshot,
            hint: "Every line needs a Spreadconnect SKU: variant.sku, or product field when there are no variants.",
          },
        },
      });
      return;
    }
    orderItems.push({
      sku,
      quantity: it.quantity,
      externalOrderItemReference: it.id,
      customerPrice: {
        amount: Math.round(it.unitPriceCents * it.quantity) / 100,
        currency,
      },
    });
  }

  const customerTaxType = customerTaxTypeForCountry(addr.country);

  const body: CreateOrderPayload = {
    orderItems,
    shipping: {
      address: scAddr,
      fromAddress: { ...scAddr },
      preferredType: "STANDARD",
      customerPrice: { amount: shippingAmount, currency },
    },
    phone,
    email: orderRow.customerEmail,
    externalOrderReference: orderRow.id,
    externalOrderName: `WEAR-${orderRow.id.slice(0, 8)}`,
    state: "CONFIRMED",
    customerTaxType,
  };

  const result = await postSpreadconnectOrder(cfg, body);
  if (!result.ok) {
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: FAILED_KIND,
        orderId: opts.wearOrderId,
        payload: {
          reason: "api_error",
          status: result.status,
          message: result.message,
        },
      },
    });
    console.error("[spreadconnect] order create failed", opts.wearOrderId, result);
    return;
  }

  await prisma.$transaction([
    prisma.wearOrder.update({
      where: { id: opts.wearOrderId },
      data: {
        externalFulfillmentRef: `sc:${result.orderReference}`,
        fulfillmentProvider: orderRow.fulfillmentProvider ?? "Spreadconnect",
      },
    }),
    prisma.wearAnalyticsEvent.create({
      data: {
        kind: SUBMITTED_KIND,
        orderId: opts.wearOrderId,
        payload: {
          spreadconnectOrderReference: result.orderReference,
          spreadconnectId: result.rawId,
        },
      },
    }),
  ]);
}
