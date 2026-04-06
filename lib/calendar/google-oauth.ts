import { encodeGoogleCalendarOAuthState } from "@/lib/calendar/google-oauth-state";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim(),
  );
}

export async function refreshGoogleCalendarAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth client not configured");
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof json.error_description === "string" ? json.error_description : "Token refresh failed");
  }
  return json as { access_token: string; expires_in: number; refresh_token?: string };
}

export function buildGoogleCalendarAuthUrl(studioId: string, requestOrigin: string): string {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CALENDAR_CLIENT_ID is not set");
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() || `${requestOrigin}/api/calendar/google/callback`;
  const state = encodeGoogleCalendarOAuthState(studioId);
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPE);
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeGoogleCalendarCode(
  code: string,
  requestOrigin: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth client not configured");
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() || `${requestOrigin}/api/calendar/google/callback`;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof json.error_description === "string" ? json.error_description : "Token exchange failed");
  }
  return json as { access_token: string; refresh_token?: string; expires_in: number };
}
