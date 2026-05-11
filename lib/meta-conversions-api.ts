import { createHash } from "node:crypto";
import { siteMetadata } from "@/lib/seo";

async function recordMetaCapiError(status: number, detail: unknown) {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.wearAnalyticsEvent.create({
      data: {
        kind: "meta_capi_error",
        payload: { status, detail } as object,
      },
    });
  } catch {
    /* non-fatal */
  }
}

const GRAPH_VERSION = "v21.0";
const DEFAULT_META_PIXEL_ID = "1956916491397785";

function hashEmailForMeta(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

function resolveMetaPixelId(): string {
  return (
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
    DEFAULT_META_PIXEL_ID
  );
}

export type MetaLeadCapiInput = {
  email: string;
  eventId?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
};

export type MetaPurchaseCapiInput = {
  eventId: string;
  orderId: string;
  value: number;
  currency: string;
  contentIds: string[];
  numItems: number;
  email?: string | null;
  eventSourceUrl?: string;
};

/**
 * Server-side Meta Conversions API — Lead events.
 * Uses FB_CONVERSIONS_API (access token) and META_PIXEL_ID / NEXT_PUBLIC_META_PIXEL_ID,
 * falling back to the production browser pixel id.
 * Failures are logged only; never throws to callers.
 */
export async function sendMetaConversionsLead(input: MetaLeadCapiInput): Promise<void> {
  const accessToken = process.env.FB_CONVERSIONS_API?.trim();
  const pixelId = resolveMetaPixelId();
  if (!accessToken || !pixelId) {
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const base = siteMetadata.url.replace(/\/+$/, "");
  const eventSourceUrl = `${base}/`;

  const userData: Record<string, string | string[]> = {
    em: [hashEmailForMeta(input.email)],
  };
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;

  const event: Record<string, unknown> = {
    event_name: "Lead",
    event_time: eventTime,
    action_source: "website",
    event_source_url: eventSourceUrl,
    user_data: userData,
    custom_data: {
      content_name: "studio_lead",
    },
  };
  if (input.eventId) event.event_id = input.eventId;

  const testCode = process.env.FB_CAPI_TEST_EVENT_CODE?.trim();
  const body: Record<string, unknown> = { data: [event] };
  if (testCode) body.test_event_code = testCode;

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`);
  url.searchParams.set("access_token", accessToken);

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[meta-capi] Lead rejected", res.status, json);
      void recordMetaCapiError(res.status, json);
    }
  } catch (e) {
    console.error("[meta-capi] Lead request failed", e);
    void recordMetaCapiError(0, e instanceof Error ? e.message : String(e));
  }
}

/**
 * Server-side Meta Conversions API — Purchase events for wear orders.
 * Uses the Stripe Checkout Session id as `event_id` to dedupe against browser Pixel `eventID`.
 */
export async function sendMetaConversionsPurchase(input: MetaPurchaseCapiInput): Promise<void> {
  const accessToken = process.env.FB_CONVERSIONS_API?.trim();
  const pixelId = resolveMetaPixelId();
  if (!accessToken || !pixelId) {
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const base = siteMetadata.url.replace(/\/+$/, "");
  const userData: Record<string, string | string[]> = {};
  const email = input.email?.trim();
  if (email) userData.em = [hashEmailForMeta(email)];

  const contentIds = input.contentIds.map((id) => id.trim()).filter(Boolean);
  const event: Record<string, unknown> = {
    event_name: "Purchase",
    event_time: eventTime,
    event_id: input.eventId,
    action_source: "website",
    event_source_url: input.eventSourceUrl ?? `${base}/wear/success`,
    user_data: userData,
    custom_data: {
      value: input.value,
      currency: input.currency.toUpperCase(),
      order_id: input.orderId,
      content_type: "product",
      content_ids: contentIds,
      num_items: input.numItems,
    },
  };

  const testCode = process.env.FB_CAPI_TEST_EVENT_CODE?.trim();
  const body: Record<string, unknown> = { data: [event] };
  if (testCode) body.test_event_code = testCode;

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`);
  url.searchParams.set("access_token", accessToken);

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(t);
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[meta-capi] Purchase rejected", res.status, json);
      void recordMetaCapiError(res.status, json);
    }
  } catch (e) {
    console.error("[meta-capi] Purchase request failed", e);
    void recordMetaCapiError(0, e instanceof Error ? e.message : String(e));
  }
}

/** Extract client IP for CAPI user_data (Railway / proxies). */
export function clientIpFromRequest(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return undefined;
}

export function sanitizeMetaEventId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  if (s.length < 8 || s.length > 64) return undefined;
  if (!/^[\dA-Za-z-]+$/.test(s)) return undefined;
  return s;
}
