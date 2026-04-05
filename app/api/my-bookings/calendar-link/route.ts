import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { ensureCalendarFeedToken } from "@/lib/calendar/ensure-feed-token";

function publicSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

/** Returns HTTPS and webcal URLs for subscribing in Apple Calendar / Google Calendar. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = await ensureCalendarFeedToken(user.id);
  const origin = publicSiteOrigin();
  const path = `/api/calendar/feed/${token}`;
  const httpsUrl = `${origin}${path}`;
  let webcalUrl: string;
  try {
    const u = new URL(origin);
    webcalUrl = `webcal://${u.host}${path}`;
  } catch {
    webcalUrl = httpsUrl.replace(/^https:\/\//i, "webcal://");
  }

  return NextResponse.json({
    httpsUrl,
    webcalUrl,
    note: "Anyone with this link can see your booking titles, times, and studios. Do not share it publicly.",
  });
}
