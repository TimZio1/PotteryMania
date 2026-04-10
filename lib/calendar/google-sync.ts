import type { CalendarConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { refreshGoogleCalendarAccessToken } from "@/lib/calendar/google-oauth";
import { resolveStudioIanaTimezone } from "@/lib/calendar/booking-timezone";
import { bookingSlotGoogleDateTimes } from "@/lib/calendar/booking-slot-times";

function shouldRetryGoogleQuota(status: number, bodyText: string): boolean {
  if (status === 429) return true;
  if (status !== 403) return false;
  const b = bodyText.toLowerCase();
  return b.includes("usagelimit") || b.includes("ratelimitexceeded") || b.includes("quota") || b.includes("rate limit");
}

/** Retries transient Google Calendar quota / rate-limit responses with exponential backoff + jitter. */
async function googleCalendarFetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const maxAttempts = 4;
  let last: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await fetch(url, init);
    if (last.ok || last.status === 401) return last;
    if (last.status === 404 && init.method === "DELETE") return last;
    const text = await last.text();
    if (attempt < maxAttempts - 1 && shouldRetryGoogleQuota(last.status, text)) {
      const ms = Math.min(10_000, 400 * 2 ** attempt) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, ms));
      continue;
    }
    return new Response(text, { status: last.status, headers: last.headers });
  }
  return last!;
}

/**
 * Push or update a confirmed/completed booking on the studio's Google Calendar.
 * Stores `googleCalendarEventId` on the booking after create; uses PUT when present.
 */
export async function syncBookingToGoogleCalendar(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: true,
      experience: {
        select: {
          title: true,
          venueName: true,
          addressLine1: true,
          city: true,
          country: true,
          durationMinutes: true,
        },
      },
      slot: true,
    },
  });
  if (!booking) return { ok: false, message: "Booking not found" };
  if (booking.bookingStatus !== "confirmed" && booking.bookingStatus !== "completed") {
    return { ok: false, message: "Only confirmed bookings sync" };
  }

  const conn = await prisma.calendarConnection.findFirst({
    where: {
      studioId: booking.studioId,
      provider: "google",
      connectionStatus: "connected",
      syncEnabled: true,
    },
  });
  if (!conn?.accessToken && !conn?.refreshToken) {
    return { ok: false, message: "No active Google calendar connection" };
  }

  let activeConn = conn;
  try {
    activeConn = await ensureFreshGoogleAccessToken(conn);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token refresh failed";
    await markConnectionError(conn.id, msg);
    await prisma.booking.update({
      where: { id: bookingId },
      data: { googleCalendarLastError: msg.slice(0, 500) },
    });
    return { ok: false, message: msg };
  }

  const token = activeConn.accessToken;
  if (!token) return { ok: false, message: "No access token" };

  const calendarId = activeConn.externalCalendarId || "primary";
  const tz = resolveStudioIanaTimezone(booking.studio);
  const eventBody = buildGoogleEventPayload(booking, tz);

  const existingId = booking.googleCalendarEventId;
  const url = existingId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await googleCalendarFetchWithRetry(url, {
    method: existingId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (res.status === 401 && activeConn.refreshToken) {
    try {
      const refreshed = await refreshGoogleCalendarAccessToken(activeConn.refreshToken);
      const expiresAt = new Date(Date.now() + Math.max(60, refreshed.expires_in) * 1000);
      await prisma.calendarConnection.update({
        where: { id: activeConn.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? activeConn.refreshToken,
          tokenExpiresAt: expiresAt,
        },
      });
      const retry = await googleCalendarFetchWithRetry(url, {
        method: existingId ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${refreshed.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });
      if (!retry.ok) {
        const err = await retry.text();
        await logSyncError(activeConn.id, booking.id, existingId ? "update" : "create", err);
        await markConnectionError(activeConn.id, err.slice(0, 500));
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleCalendarLastError: err.slice(0, 500) },
        });
        return { ok: false, message: "Google Calendar API error after refresh" };
      }
      const json = (await retry.json()) as { id?: string };
      const newEventId = json.id ?? existingId;
      if (newEventId && !existingId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            googleCalendarEventId: newEventId,
            googleCalendarSyncedAt: new Date(),
            googleCalendarLastError: null,
          },
        });
      } else {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleCalendarSyncedAt: new Date(), googleCalendarLastError: null },
        });
      }
      await prisma.calendarConnection.update({
        where: { id: activeConn.id },
        data: { lastSyncAt: new Date(), syncErrorState: null, connectionStatus: "connected" },
      });
      await logSyncSuccess(activeConn.id, booking.id, existingId ? "update" : "create");
      return { ok: true, message: "Synced" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Retry failed";
      await markConnectionError(activeConn.id, msg);
      await prisma.booking.update({
        where: { id: bookingId },
        data: { googleCalendarLastError: msg.slice(0, 500) },
      });
      return { ok: false, message: msg };
    }
  }

  if (!res.ok) {
    const err = await res.text();
    await logSyncError(activeConn.id, booking.id, existingId ? "update" : "create", err);
    await markConnectionError(activeConn.id, err.slice(0, 500));
    await prisma.booking.update({
      where: { id: booking.id },
      data: { googleCalendarLastError: err.slice(0, 500) },
    });
    return { ok: false, message: "Google Calendar API error" };
  }

  const json = (await res.json()) as { id?: string };
  const newEventId = json.id ?? existingId;
  if (newEventId && !existingId) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        googleCalendarEventId: newEventId,
        googleCalendarSyncedAt: new Date(),
        googleCalendarLastError: null,
      },
    });
  } else {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { googleCalendarSyncedAt: new Date(), googleCalendarLastError: null },
    });
  }

  await prisma.calendarConnection.update({
    where: { id: activeConn.id },
    data: { lastSyncAt: new Date(), syncErrorState: null, connectionStatus: "connected" },
  });
  await logSyncSuccess(activeConn.id, booking.id, existingId ? "update" : "create");
  return { ok: true, message: "Synced" };
}

const DELETE_ERR_PREFIX = "Google Calendar delete failed:";

/**
 * Remove the Google event for this booking. Keeps `googleCalendarEventId` until DELETE succeeds
 * (or 404), so retries and cleanup remain possible.
 */
export async function removeGoogleCalendarEventForBooking(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, studioId: true, googleCalendarEventId: true },
  });
  if (!booking?.googleCalendarEventId) {
    return { ok: true, message: "No Google event on booking" };
  }

  const conn = await prisma.calendarConnection.findFirst({
    where: {
      studioId: booking.studioId,
      provider: "google",
      OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!conn?.accessToken && !conn?.refreshToken) {
    const msg = `${DELETE_ERR_PREFIX} no OAuth tokens (reconnect Google Calendar in studio settings to remove remote event ${booking.googleCalendarEventId.slice(0, 12)}…).`;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { googleCalendarLastError: msg.slice(0, 500) },
    });
    return { ok: false, message: msg };
  }

  let activeConn = conn;
  try {
    activeConn = await ensureFreshGoogleAccessToken(conn);
  } catch (e) {
    const msg = `${DELETE_ERR_PREFIX} ${e instanceof Error ? e.message : "token refresh failed"}`;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { googleCalendarLastError: msg.slice(0, 500) },
    });
    return { ok: false, message: msg };
  }

  const token = activeConn.accessToken;
  if (!token) {
    const msg = `${DELETE_ERR_PREFIX} no access token after refresh.`;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { googleCalendarLastError: msg.slice(0, 500) },
    });
    return { ok: false, message: msg };
  }

  const calendarId = activeConn.externalCalendarId || "primary";
  const eid = booking.googleCalendarEventId;
  const delUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eid)}`;

  const res = await googleCalendarFetchWithRetry(delUrl, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    await logSyncError(activeConn.id, booking.id, "delete", err);
    const msg = `${DELETE_ERR_PREFIX} ${err.slice(0, 400)}`;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { googleCalendarLastError: msg.slice(0, 500) },
    });
    return { ok: false, message: msg };
  }

  await logSyncSuccess(activeConn.id, booking.id, "delete");

  await prisma.booking.update({
    where: { id: bookingId },
    data: { googleCalendarEventId: null, googleCalendarSyncedAt: null, googleCalendarLastError: null },
  });
  return { ok: true, message: "Removed from Google Calendar" };
}

async function ensureFreshGoogleAccessToken(conn: CalendarConnection): Promise<CalendarConnection> {
  const now = Date.now();
  const exp = conn.tokenExpiresAt?.getTime() ?? 0;
  const fresh = exp - now > 120_000;
  if (fresh && conn.accessToken) return conn;
  if (!conn.refreshToken) {
    if (conn.accessToken) return conn;
    throw new Error("No refresh token; reconnect Google Calendar");
  }
  const refreshed = await refreshGoogleCalendarAccessToken(conn.refreshToken);
  const expiresAt = new Date(Date.now() + Math.max(60, refreshed.expires_in) * 1000);
  return prisma.calendarConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? conn.refreshToken,
      tokenExpiresAt: expiresAt,
    },
  });
}

function buildLocation(booking: {
  experience: { venueName: string | null; addressLine1: string | null; city: string | null; country: string | null };
  studio: { addressLine1: string; city: string; country: string };
}): string {
  const bits: string[] = [];
  if (booking.experience.venueName) bits.push(booking.experience.venueName);
  const line = booking.experience.addressLine1 || booking.studio.addressLine1;
  if (line) bits.push(line);
  const city = booking.experience.city || booking.studio.city;
  const country = booking.experience.country || booking.studio.country;
  if (city || country) bits.push([city, country].filter(Boolean).join(", "));
  return bits.join(", ");
}

function buildGoogleEventPayload(
  booking: {
    id: string;
    studioId: string;
    experience: {
      title: string;
      venueName: string | null;
      addressLine1: string | null;
      city: string | null;
      country: string | null;
      durationMinutes: number;
    };
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    ticketRef: string | null;
    participantCount: number;
    notes: string | null;
    slot: { slotDate: Date; startTime: string; endTime: string };
    studio: { displayName: string; addressLine1: string; city: string; country: string; ianaTimezone: string | null };
  },
  timeZone: string,
) {
  const { start, end } = bookingSlotGoogleDateTimes(
    booking.slot,
    Math.max(1, booking.experience.durationMinutes || 60),
    timeZone,
  );
  const location = buildLocation(booking);
  const descLines = [
    "PotteryMania booking",
    `Customer: ${booking.customerName}`,
    booking.customerEmail,
    booking.customerPhone ? `Phone: ${booking.customerPhone}` : null,
    `Participants: ${booking.participantCount}`,
    booking.ticketRef ? `Reference: ${booking.ticketRef}` : `Booking ID: ${booking.id}`,
    booking.notes?.trim() ? `Notes: ${booking.notes.trim()}` : null,
  ].filter(Boolean);

  return {
    summary: `${booking.experience.title} — ${booking.customerName}`,
    description: descLines.join("\n"),
    location: location || undefined,
    start,
    end,
    extendedProperties: {
      private: {
        potterymaniaBookingId: booking.id,
        potterymaniaStudioId: booking.studioId,
        ...(booking.ticketRef ? { potterymaniaTicketRef: booking.ticketRef } : {}),
      },
    },
  };
}

async function markConnectionError(connectionId: string, message: string) {
  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: { syncErrorState: message.slice(0, 500), connectionStatus: "error" },
  });
}

async function logSyncError(
  connectionId: string,
  bookingId: string,
  action: "create" | "update" | "delete",
  message: string,
) {
  await prisma.calendarSyncLog.create({
    data: {
      calendarConnectionId: connectionId,
      bookingId,
      actionType: action,
      status: "error",
      message: message.slice(0, 500),
    },
  });
}

async function logSyncSuccess(
  connectionId: string,
  bookingId: string,
  action: "create" | "update" | "delete",
) {
  await prisma.calendarSyncLog.create({
    data: {
      calendarConnectionId: connectionId,
      bookingId,
      actionType: action,
      status: "success",
      message: null,
    },
  });
}
