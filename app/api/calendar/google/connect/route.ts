import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { buildGoogleCalendarAuthUrl, googleCalendarOAuthConfigured } from "@/lib/calendar/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleCalendarOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar OAuth is not configured (set GOOGLE_CALENDAR_CLIENT_ID and secret)." },
      { status: 503 },
    );
  }
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const studioId = u.searchParams.get("studioId")?.trim();
  if (!studioId) return NextResponse.json({ error: "studioId required" }, { status: 400 });

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, ownerUserId: user.id },
    select: { id: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origin = new URL(req.url).origin;
  const authUrl = buildGoogleCalendarAuthUrl(studioId, origin);
  return NextResponse.redirect(authUrl);
}
