/**
 * Push paid native wear orders to Spreadconnect for fulfilment.
 * Requires line-level Spreadconnect SKUs on variants (`sku`) or, for products without variants,
 * `WearProduct.externalFulfillmentId` set to the Spreadconnect article variant SKU.
 *
 * Request body aligns with `docs/reference/spreadconnect-openapi.json` → `CreateOrder`, `CreateOrderItem`, `Address`, `CustomerPrice`.
 */
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { isRuntimeFlagEnabled, RUNTIME_FLAG_KEYS } from "@/lib/runtime-feature-flags";
import { ensureSpreadconnectSubmitDeferred } from "@/lib/wear-fulfillment-defer";
import { escalateWearOrderSpreadconnectFailure } from "@/lib/wear-order-escalate";

/**
 * Resolve ship-to for Spreadconnect from a completed Checkout Session.
 * Tries: collected shipping → legacy shipping_details → customer_details.address (last resort for some API shapes).
 */
function checkoutShippingDetails(
  session: Stripe.Checkout.Session,
  fallbackName: string,
): { name: string; address: Stripe.Address } | null {
  const ci = session.collected_information;
  const nameFromCustomer =
    session.customer_details?.name?.trim() ||
    session.customer_details?.individual_name?.trim() ||
    session.customer_details?.business_name?.trim() ||
    ci?.individual_name?.trim() ||
    ci?.business_name?.trim() ||
    fallbackName.trim() ||
    "Customer";

  const fromCollected = ci?.shipping_details;
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

/** OpenAPI Address: state is required for USA and Canada (ISO 3166-1 alpha-2 country + 2-letter subdivision). */
function spreadconnectStateForCountry(
  country: string,
  state: string | null | undefined,
): { ok: true; state: string } | { ok: false } {
  const c = country.toUpperCase();
  const raw = (state || "").trim().toUpperCase();
  const two = raw.length >= 2 ? raw.slice(0, 2) : "";
  const validTwo = /^[A-Z]{2}$/.test(two) ? two : "";

  if (c === "US" || c === "CA") {
    if (validTwo) return { ok: true, state: validTwo };
    const fb =
      c === "US"
        ? process.env.SPREADCONNECT_FALLBACK_US_STATE?.trim().toUpperCase()
        : process.env.SPREADCONNECT_FALLBACK_CA_PROVINCE?.trim().toUpperCase();
    if (fb && /^[A-Z]{2}$/.test(fb)) return { ok: true, state: fb };
    return { ok: false };
  }

  return { ok: true, state: validTwo || (raw ? raw : "—") };
}

function toSpreadconnectAddress(
  nameSource: string,
  line1: string,
  line2: string | null | undefined,
  city: string,
  stateForSc: string,
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
    state: stateForSc,
    zipCode: postal || "—",
  };
}

/** Shipping paid in checkout (minor units), for Spreadconnect `shipping.customerPrice`. */
function resolveShippingAmountCents(
  session: Stripe.Checkout.Session,
  orderRow: { subtotalCents: number; amountTotalCents: number | null },
): number {
  const sc = session.shipping_cost?.amount_total;
  if (typeof sc === "number" && sc >= 0) return sc;
  const td = session.total_details?.amount_shipping;
  if (typeof td === "number" && td >= 0) return td;
  const total = orderRow.amountTotalCents;
  if (total != null && total >= orderRow.subtotalCents) {
    return Math.max(0, total - orderRow.subtotalCents);
  }
  return 900;
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

type ShippingPreferredType = "STANDARD" | "PREMIUM" | "EXPRESS";

type CreateOrderPayload = {
  orderItems: {
    sku: string;
    quantity: number;
    externalOrderItemReference?: string;
    customerPrice: { amount: number; currency?: string };
  }[];
  shipping: {
    address: ScAddress;
    /** OpenAPI optional; we mirror ship-to as RTS when not configured separately. */
    fromAddress?: ScAddress;
    preferredType?: ShippingPreferredType;
    customerPrice: { amount: number; currency?: string };
  };
  phone: string;
  email: string;
  externalOrderReference: string;
  externalOrderName?: string;
  state?: "NEW" | "CONFIRMED";
  customerTaxType?: "SALESTAX" | "VAT" | "NOT_TAXABLE";
};

async function postSpreadconnectOrder(
  cfg: NonNullable<ReturnType<typeof getSpreadconnectConfig>>,
  body: CreateOrderPayload,
): Promise<{ ok: true; orderReference: number; rawId: number } | { ok: false; status: number; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SPOD-ACCESS-TOKEN": cfg.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(cfg.orderTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return {
        ok: false,
        status: 504,
        message: `Spreadconnect timed out after ${cfg.orderTimeoutMs}ms`,
      };
    }
    return {
      ok: false,
      status: 503,
      message: error instanceof Error ? error.message : "Spreadconnect request failed",
    };
  }

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

  const fulfillmentEnabled = await isRuntimeFlagEnabled(RUNTIME_FLAG_KEYS.wearFulfillmentEnabled, true);
  if (!fulfillmentEnabled) {
    await ensureSpreadconnectSubmitDeferred({
      wearOrderId: opts.wearOrderId,
      reason: "fulfillment_disabled",
      detail:
        "Wear fulfillment is disabled (runtime flag wear_fulfillment_enabled). Order will submit when re-enabled.",
    });
    return;
  }

  if (!cfg.liveSubmissionAllowed) {
    await ensureSpreadconnectSubmitDeferred({
      wearOrderId: opts.wearOrderId,
      reason: "live_submission_disabled",
      detail: `Spreadconnect live submission is off (supplierEnvironment=${cfg.supplierEnvironment}). Pending job will retry when allowed.`,
      payload: { supplierEnvironment: cfg.supplierEnvironment },
    });
    return;
  }

  const recordFailure = async (reasonCode: string, payload: Record<string, unknown>) => {
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: FAILED_KIND,
        orderId: opts.wearOrderId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    await escalateWearOrderSpreadconnectFailure({
      wearOrderId: opts.wearOrderId,
      customerEmail: orderRow.customerEmail,
      customerName: orderRow.customerName,
      reasonCode,
      detail: payload,
    });
    console.error("[spreadconnect] wear order failure", opts.wearOrderId, reasonCode, payload);
  };

  const session = opts.stripeSession;
  const shippingDetails = checkoutShippingDetails(session, orderRow.customerName);
  const addr = shippingDetails?.address;
  if (!shippingDetails || !addr?.line1 || !addr.country) {
    await recordFailure("missing_stripe_shipping", {
      reason: "missing_stripe_shipping",
      sessionId: session.id,
    });
    return;
  }

  const shipName = shippingDetails.name.trim() || orderRow.customerName;
  const country = (addr.country || "").toUpperCase() || "DE";
  const stateNorm = spreadconnectStateForCountry(country, addr.state);
  if (!stateNorm.ok) {
    await recordFailure("invalid_us_ca_state", {
      reason: "invalid_us_ca_state",
      country,
      hint: "Spreadconnect requires a 2-letter state/province for US/CA. Set SPREADCONNECT_FALLBACK_US_STATE or SPREADCONNECT_FALLBACK_CA_PROVINCE, or ensure Stripe collects subdivision.",
    });
    return;
  }

  const scAddr = toSpreadconnectAddress(
    shipName,
    addr.line1,
    addr.line2,
    addr.city ?? "",
    stateNorm.state,
    addr.postal_code ?? "",
    country,
  );

  const currency = (session.currency || orderRow.currency || "eur").toUpperCase();
  const shippingCents = resolveShippingAmountCents(session, orderRow);
  const shippingAmount = shippingCents / 100;

  const phone =
    session.customer_details?.phone?.trim() ||
    process.env.SPREADCONNECT_FALLBACK_PHONE?.trim() ||
    "+0000000000";

  const email =
    orderRow.customerEmail.trim() || session.customer_details?.email?.trim() || "";
  if (!email) {
    await recordFailure("missing_customer_email", {
      reason: "missing_customer_email",
      sessionId: session.id,
    });
    return;
  }

  const orderItems: CreateOrderPayload["orderItems"] = [];
  for (const it of orderRow.items) {
    const sku = resolveSpreadconnectSku(it);
    if (!sku) {
      await recordFailure("missing_spreadconnect_sku", {
        reason: "missing_spreadconnect_sku",
        wearOrderItemId: it.id,
        productNameSnapshot: it.productNameSnapshot,
        hint: "Every line needs a Spreadconnect SKU: variant.sku, or product field when there are no variants.",
      });
      return;
    }
    orderItems.push({
      sku,
      quantity: it.quantity,
      externalOrderItemReference: String(it.id),
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
    email,
    externalOrderReference: String(orderRow.id),
    externalOrderName: `WEAR-${orderRow.id.slice(0, 8)}`,
    state: "CONFIRMED",
    customerTaxType,
  };

  const result = await postSpreadconnectOrder(cfg, body);
  if (!result.ok) {
    const reasonCode = result.status === 504 ? "api_timeout" : "api_error";
    await recordFailure(reasonCode, {
      reason: reasonCode,
      status: result.status,
      message: result.message,
    });
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
