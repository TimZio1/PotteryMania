import type { PrismaClient } from "@prisma/client";

export type StudentCrmRow = {
  emailNormalized: string;
  email: string;
  displayName: string;
  phone: string | null;
  contactId: string | null;
  bookingCount: number;
  participantsTotal: number;
  attendedCount: number;
  lastBookingAt: string | null;
  lastSessionDate: string | null;
  lastClassTitle: string | null;
  notes: string | null;
  tags: string[];
  source: "booking" | "manual" | "both";
};

export function normalizeStudentEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const ROLLUP_STATUSES = [
  "pending",
  "awaiting_vendor_approval",
  "confirmed",
  "cancellation_requested",
  "completed",
  "no_show",
] as const;

export async function buildStudentCrmRows(prisma: PrismaClient, studioId: string): Promise<StudentCrmRow[]> {
  const [saved, bookings] = await Promise.all([
    prisma.studioContact.findMany({
      where: { studioId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        studioId,
        bookingStatus: { in: [...ROLLUP_STATUSES] },
      },
      select: {
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        participantCount: true,
        bookingStatus: true,
        createdAt: true,
        experience: { select: { title: true } },
        slot: { select: { slotDate: true } },
      },
    }),
  ]);

  type Acc = {
    email: string;
    emailNormalized: string;
    displayName: string;
    phone: string | null;
    bookingCount: number;
    participantsTotal: number;
    attendedCount: number;
    lastBookingAt: Date | null;
    lastSessionDate: Date | null;
    lastClassTitle: string | null;
  };

  const fromBookings = new Map<string, Acc>();

  for (const b of bookings) {
    const emailNormalized = normalizeStudentEmail(b.customerEmail);
    const slotD = b.slot.slotDate;
    const cur = fromBookings.get(emailNormalized);
    if (!cur) {
      fromBookings.set(emailNormalized, {
        email: b.customerEmail.trim(),
        emailNormalized,
        displayName: b.customerName,
        phone: b.customerPhone,
        bookingCount: 1,
        participantsTotal: b.participantCount,
        attendedCount: b.bookingStatus === "completed" ? 1 : 0,
        lastBookingAt: b.createdAt,
        lastSessionDate: slotD,
        lastClassTitle: b.experience.title,
      });
    } else {
      cur.bookingCount += 1;
      cur.participantsTotal += b.participantCount;
      if (b.bookingStatus === "completed") cur.attendedCount += 1;
      if (!cur.phone && b.customerPhone) cur.phone = b.customerPhone;
      if (!cur.lastBookingAt || b.createdAt > cur.lastBookingAt) {
        cur.lastBookingAt = b.createdAt;
        cur.lastClassTitle = b.experience.title;
      }
      if (!cur.lastSessionDate || slotD > cur.lastSessionDate) {
        cur.lastSessionDate = slotD;
      }
    }
  }

  const rows: StudentCrmRow[] = [];
  const seen = new Set<string>();

  for (const c of saved) {
    seen.add(c.emailNormalized);
    const roll = fromBookings.get(c.emailNormalized);
    rows.push({
      emailNormalized: c.emailNormalized,
      email: roll?.email ?? c.emailNormalized,
      displayName: c.displayName.trim() || roll?.displayName || c.emailNormalized,
      phone: c.phone?.trim() || roll?.phone || null,
      contactId: c.id,
      bookingCount: roll?.bookingCount ?? 0,
      participantsTotal: roll?.participantsTotal ?? 0,
      attendedCount: roll?.attendedCount ?? 0,
      lastBookingAt: roll?.lastBookingAt?.toISOString() ?? null,
      lastSessionDate: roll?.lastSessionDate?.toISOString().slice(0, 10) ?? null,
      lastClassTitle: roll?.lastClassTitle ?? null,
      notes: c.notes,
      tags: c.tags ?? [],
      source: roll ? "both" : "manual",
    });
  }

  for (const [key, roll] of fromBookings) {
    if (seen.has(key)) continue;
    rows.push({
      emailNormalized: key,
      email: roll.email,
      displayName: roll.displayName,
      phone: roll.phone,
      contactId: null,
      bookingCount: roll.bookingCount,
      participantsTotal: roll.participantsTotal,
      attendedCount: roll.attendedCount,
      lastBookingAt: roll.lastBookingAt?.toISOString() ?? null,
      lastSessionDate: roll.lastSessionDate?.toISOString().slice(0, 10) ?? null,
      lastClassTitle: roll.lastClassTitle,
      notes: null,
      tags: [],
      source: "booking",
    });
  }

  rows.sort((a, b) => {
    const ta = a.lastBookingAt ? new Date(a.lastBookingAt).getTime() : 0;
    const tb = b.lastBookingAt ? new Date(b.lastBookingAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.displayName.localeCompare(b.displayName);
  });

  return rows;
}

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}
