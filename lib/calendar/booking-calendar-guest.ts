import { createHmac, timingSafeEqual } from "node:crypto";

function signingSecret(): string {
  return (
    process.env.BOOKING_CALENDAR_LINK_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

/** 90-day signed link for email + shareable ICS without login. */
export function createBookingCalendarGuestQuery(bookingId: string): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + 90 * 24 * 3600;
  const secret = signingSecret();
  if (!secret) {
    return { exp, sig: "" };
  }
  const sig = createHmac("sha256", secret).update(`${bookingId}:${exp}`).digest("base64url");
  return { exp, sig };
}

export function verifyBookingCalendarGuestQuery(bookingId: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const secret = signingSecret();
  if (!secret || !sig) return false;
  const expected = createHmac("sha256", secret).update(`${bookingId}:${exp}`).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function guestCalendarLinksConfigured(): boolean {
  return Boolean(signingSecret());
}
