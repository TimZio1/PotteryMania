import { createHash } from "node:crypto";
import { siteMetadata } from "@/lib/seo";

const GRAPH_VERSION = "v21.0";

function hashEmailForMeta(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex");
}

export type MetaLeadCapiInput = {
  email: string;
  eventId?: string;
  clientIp?: string;
  userAgent?: string;
  fbc?: string;
  fbp?: string;
};

/**
 * Server-side Meta Conversions API — Lead (early access).
 * Uses FB_CONVERSIONS_API (access token) and META_PIXEL_ID or NEXT_PUBLIC_META_PIXEL_ID.
 * Failures are logged only; never throws to callers.
 */
export async function sendMetaConversionsLead(input: MetaLeadCapiInput): Promise<void> {
  const accessToken = process.env.FB_CONVERSIONS_API?.trim();
  const pixelId =
    process.env.META_PIXEL_ID?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!accessToken || !pixelId) {
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const base = siteMetadata.url.replace(/\/+$/, "");
  const eventSourceUrl = `${base}/early-access`;

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
      content_name: "early_access",
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
    }
  } catch (e) {
    console.error("[meta-capi] Lead request failed", e);
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
