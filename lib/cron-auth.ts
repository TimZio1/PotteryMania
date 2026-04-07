import { createHash, timingSafeEqual } from "node:crypto";

function sha256Utf8(s: string): Buffer {
  return createHash("sha256").update(s, "utf8").digest();
}

/** Timing-safe Bearer compare for `CRON_SECRET` (avoids early exit on length mismatch). */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 8) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return false;
  try {
    return timingSafeEqual(sha256Utf8(secret), sha256Utf8(token));
  } catch {
    return false;
  }
}
