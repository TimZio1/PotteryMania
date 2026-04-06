import type { CalendarConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { refreshGoogleCalendarAccessToken } from "@/lib/calendar/google-oauth";

/**
 * Push or update a confirmed/completed booking on the studio's Google Calendar.
 * Stores `googleCalendarEventId` on the booking after create; uses PUT when present.
 */
export async function syncBookingToGoogleCalendar(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: true,
      experience: { select: { title: true } },
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
    return { ok: false, message: msg };
  }

  const token = activeConn.accessToken;
  if (!token) return { ok: false, message: "No access token" };

  const calendarId = activeConn.externalCalendarId || "primary";
  const eventBody = buildGoogleEventPayload(booking);

  const existingId = booking.googleCalendarEventId;
  const url = existingId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(url, {
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
      const retry = await fetch(url, {
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
        return { ok: false, message: "Google Calendar API error after refresh" };
      }
      const json = (await retry.json()) as { id?: string };
      const newEventId = json.id ?? existingId;
      if (newEventId && !existingId) {
        await prisma.booking.update({ where: { id: booking.id }, data: { googleCalendarEventId: newEventId } });
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
      return { ok: false, message: msg };
    }
  }

  if (!res.ok) {
    const err = await res.text();
    await logSyncError(activeConn.id, booking.id, existingId ? "update" : "create", err);
    await markConnectionError(activeConn.id, err.slice(0, 500));
    return { ok: false, message: "Google Calendar API error" };
  }

  const json = (await res.json()) as { id?: string };
  const newEventId = json.id ?? existingId;
  if (newEventId && !existingId) {
    await prisma.booking.update({ where: { id: booking.id }, data: { googleCalendarEventId: newEventId } });
  }

  await prisma.calendarConnection.update({
    where: { id: activeConn.id },
    data: { lastSyncAt: new Date(), syncErrorState: null, connectionStatus: "connected" },
  });
  await logSyncSuccess(activeConn.id, booking.id, existingId ? "update" : "create");
  return { ok: true, message: "Synced" };
}

/** Remove the Google event for this booking (e.g. after cancellation). Best-effort; clears local id. */
export async function removeGoogleCalendarEventForBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, studioId: true, googleCalendarEventId: true },
  });
  if (!booking?.googleCalendarEventId) return;

  const conn = await prisma.calendarConnection.findFirst({
    where: {
      studioId: booking.studioId,
      provider: "google",
      connectionStatus: "connected",
      syncEnabled: true,
    },
  });
  if (!conn?.accessToken && !conn?.refreshToken) {
    await prisma.booking.update({ where: { id: bookingId }, data: { googleCalendarEventId: null } });
    return;
  }

  let activeConn = conn;
  try {
    activeConn = await ensureFreshGoogleAccessToken(conn);
  } catch {
    await prisma.booking.update({ where: { id: bookingId }, data: { googleCalendarEventId: null } });
    return;
  }

  const token = activeConn.accessToken;
  if (!token) {
    await prisma.booking.update({ where: { id: bookingId }, data: { googleCalendarEventId: null } });
    return;
  }

  const calendarId = activeConn.externalCalendarId || "primary";
  const eid = booking.googleCalendarEventId;
  const delUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eid)}`;

  const res = await fetch(delUrl, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 404) {
    await logSyncError(activeConn.id, booking.id, "delete", await res.text());
  } else {
    await logSyncSuccess(activeConn.id, booking.id, "delete");
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { googleCalendarEventId: null } });
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

function buildGoogleEventPayload(booking: {
  experience: { title: string };
  customerName: string;
  customerEmail: string;
  ticketRef: string | null;
  id: string;
  slot: { slotDate: Date; startTime: string; endTime: string };
}) {
  const slotDate = booking.slot.slotDate.toISOString().slice(0, 10);
  const start = `${slotDate}T${normalizeTime(booking.slot.startTime)}:00`;
  const end = `${slotDate}T${normalizeTime(booking.slot.endTime)}:00`;
  return {
    summary: `${booking.experience.title} — ${booking.customerName}`,
    description: `PotteryMania booking\n${booking.customerEmail}\nRef: ${booking.ticketRef ?? booking.id}`,
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
  };
}

function normalizeTime(t: string): string {
  const p = t.trim();
  if (/^\d{2}:\d{2}$/.test(p)) return p;
  if (/^\d{2}:\d{2}:\d{2}$/.test(p)) return p.slice(0, 5);
  return "10:00";
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
