import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { decodeGoogleCalendarOAuthState } from "@/lib/calendar/google-oauth-state";
import { exchangeGoogleCalendarCode } from "@/lib/calendar/google-oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/dashboard", req.url));
  }

  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const err = u.searchParams.get("error");
  const origin = u.origin;

  if (err) {
    return NextResponse.redirect(new URL(`/dashboard?calendar_error=${encodeURIComponent(err)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?calendar_error=missing_params", req.url));
  }

  const decoded = decodeGoogleCalendarOAuthState(state);
  if (!decoded) {
    return NextResponse.redirect(new URL("/dashboard?calendar_error=invalid_state", req.url));
  }

  const studio = await prisma.studio.findFirst({
    where: { id: decoded.studioId, ownerUserId: user.id },
    select: { id: true },
  });
  if (!studio) {
    return NextResponse.redirect(new URL("/dashboard?calendar_error=studio", req.url));
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code, origin);
    const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in) * 1000);

    const existing = await prisma.calendarConnection.findFirst({
      where: { studioId: studio.id, provider: "google" },
    });

    if (existing) {
      await prisma.calendarConnection.update({
        where: { id: existing.id },
        data: {
          connectionStatus: "connected",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing.refreshToken,
          tokenExpiresAt: expiresAt,
          externalCalendarId: existing.externalCalendarId ?? "primary",
          syncErrorState: null,
        },
      });
    } else {
      await prisma.calendarConnection.create({
        data: {
          studioId: studio.id,
          provider: "google",
          connectionStatus: "connected",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          tokenExpiresAt: expiresAt,
          externalCalendarId: "primary",
        },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_failed";
    return NextResponse.redirect(new URL(`/dashboard/${studio.id}/settings?calendar_error=${encodeURIComponent(msg)}`, req.url));
  }

  return NextResponse.redirect(new URL(`/dashboard/${studio.id}/settings?calendar_connected=1`, req.url));
}
