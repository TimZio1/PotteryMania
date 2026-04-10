import crypto from "crypto";
import { calendarOAuthStateSecret } from "@/lib/calendar/calendar-oauth-secret";

/** Signed opaque state for Google OAuth (studio id binding). */
export function encodeGoogleCalendarOAuthState(studioId: string): string {
  const ts = Date.now();
  const payload = `${studioId}:${ts}`;
  const sig = crypto.createHmac("sha256", calendarOAuthStateSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf8").toString("base64url");
}

export function decodeGoogleCalendarOAuthState(state: string): { studioId: string } | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const lastColon = raw.lastIndexOf(":");
    if (lastColon <= 0) return null;
    const sig = raw.slice(lastColon + 1);
    const payload = raw.slice(0, lastColon);
    const expect = crypto.createHmac("sha256", calendarOAuthStateSecret()).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "utf8");
    const expectBuf = Buffer.from(expect, "utf8");
    if (sigBuf.length !== expectBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectBuf)) return null;
    const colon = payload.indexOf(":");
    if (colon <= 0) return null;
    const studioId = payload.slice(0, colon);
    const ts = Number(payload.slice(colon + 1));
    if (!studioId || !Number.isFinite(ts) || Date.now() - ts > 15 * 60 * 1000) return null;
    return { studioId };
  } catch {
    return null;
  }
}
